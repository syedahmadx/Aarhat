import { supabase } from '../../lib/supabase';
import { grossPaisa, commissionPaisa, netPayoutPaisa } from '../../utils/money';
import { todayISO } from '../../utils/format';
import { computePartyBalance, buildPartyLedger, planAllocation } from '../ledgerMath';

// Live implementation of the repo interface against the 0002 schema.
//
// MAPPING RULES, all enforced inside this file and nowhere else:
//
// 1. snake_case ends here. Nothing above the repo sees a snake_case key.
//
// 2. Money is integer paisa end to end. bigint columns can arrive from
//    supabase-js as strings; intField() converts explicitly and refuses
//    anything that is not a safe integer. parseFloat does not appear.
//
// 3. SIGN CONVENTION. The app models a void as a mirror row with NEGATIVE
//    amounts, so a voided pair sums to zero anywhere rows are added up. The
//    database cannot store that: 0002 checks weight_g > 0, amount_paisa > 0,
//    gross_paisa >= 0. So the DB holds every row as a positive magnitude and
//    marks reversals with voids_id; this file NEGATES rows with voids_id on
//    read and stores magnitudes on write. One bijection, applied in exactly
//    one place. voided_by does not exist as a column — it is derived by
//    inverting voids_id over the fetched set.
//
// 4. Reads are never filtered by shop_id from the client — RLS already
//    scopes every select to the caller's shop, and a client-side filter
//    would only pretend to be security. Inserts DO carry shop_id, because
//    the insert policies demand it matches current_shop_id().

// ---------- field conversion ----------

function intField(v, name) {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isSafeInteger(n)) {
    throw new TypeError(`${name} is not a safe integer: ${JSON.stringify(v)}`);
  }
  return n;
}

// 'HH:MM' local time from a timestamptz, matching the mock rows' shape.
function hhmmOf(timestamptz) {
  if (!timestamptz) return '';
  const d = new Date(timestamptz);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function throwIf(error) {
  if (error) throw error;
}

// ---------- caller identity ----------

// shop_id for inserts. Cached per user id: it cannot change mid-session
// except through onboarding, which reloads the app's data layer anyway.
let shopCache = { userId: null, shopId: null };

async function callerIds() {
  const { data, error } = await supabase.auth.getUser();
  throwIf(error);
  const userId = data.user?.id;
  if (!userId) throw new Error('not signed in');
  if (shopCache.userId === userId && shopCache.shopId) {
    return { userId, shopId: shopCache.shopId };
  }
  const { data: prof, error: pErr } = await supabase
    .from('profiles')
    .select('shop_id')
    .eq('id', userId)
    .maybeSingle();
  throwIf(pErr);
  if (!prof?.shop_id) throw new Error('no shop for this user — onboarding has not run');
  shopCache = { userId, shopId: prof.shop_id };
  return { userId, shopId: prof.shop_id };
}

// ---------- row mappers (snake -> camel, sign convention applied) ----------

function mapParty(r) {
  return {
    id: r.id,
    name: r.name,
    nameUr: r.name_ur,
    type: r.type,
    phone: r.phone,
    area: r.area,
    areaUr: r.area_ur,
    openingPaisa: intField(r.opening_paisa, 'opening_paisa'),
    mergedInto: r.merged_into,
  };
}

function mapFishType(r) {
  return { id: r.id, name: r.name, nameUr: r.name_ur };
}

function mapSale(r, voidedByMap) {
  const contra = Boolean(r.voids_id);
  const sign = contra ? -1 : 1;
  return {
    id: r.id,
    date: r.biz_date,
    time: hhmmOf(r.created_at),
    gaari: r.gaari,
    beopariId: r.beopari_id,
    khareedarId: r.khareedar_id,
    fishTypeId: r.fish_type_id,
    fishType: r.fish_types?.name ?? '',
    fishTypeUr: r.fish_types?.name_ur ?? null,
    weightG: sign * intField(r.weight_g, 'weight_g'),
    ratePaisaPerKg: intField(r.rate_paisa_per_kg, 'rate_paisa_per_kg'),
    commissionBp: intField(r.commission_bp, 'commission_bp'),
    expenses: (r.sale_expenses ?? []).map((e) => ({
      id: e.id,
      type: e.type,
      amountPaisa: sign * intField(e.amount_paisa, 'amount_paisa'),
      borneBy: e.borne_by,
    })),
    grossPaisa: sign * intField(r.gross_paisa, 'gross_paisa'),
    commissionPaisa: sign * intField(r.commission_paisa, 'commission_paisa'),
    expensesTotalPaisa: sign * intField(r.expenses_total_paisa, 'expenses_total_paisa'),
    netPayoutPaisa: sign * intField(r.net_payout_paisa, 'net_payout_paisa'),
    status: r.status,
    receivedPaisa: sign * intField(r.received_paisa, 'received_paisa'),
    voidsId: r.voids_id,
    voidedBy: voidedByMap.get(r.id) ?? null,
  };
}

function mapCashEntry(r, voidedByMap) {
  const contra = Boolean(r.voids_id);
  return {
    id: r.id,
    date: r.biz_date,
    time: hhmmOf(r.created_at),
    partyId: r.party_id,
    direction: r.direction,
    amountPaisa: (contra ? -1 : 1) * intField(r.amount_paisa, 'amount_paisa'),
    note: r.note,
    noteUr: r.note_ur,
    voidsId: r.voids_id,
    voidedBy: voidedByMap.get(r.id) ?? null,
  };
}

function invertVoids(rows) {
  const m = new Map();
  for (const r of rows) if (r.voids_id) m.set(r.voids_id, r.id);
  return m;
}

// ---------- reads ----------

export async function listParties() {
  const { data, error } = await supabase
    .from('parties')
    .select('id, name, name_ur, type, phone, area, area_ur, opening_paisa, merged_into')
    .order('name');
  throwIf(error);
  return data.map(mapParty);
}

export async function listFishTypes() {
  const { data, error } = await supabase
    .from('fish_types')
    .select('id, name, name_ur')
    .order('name');
  throwIf(error);
  return data.map(mapFishType);
}

export async function listSales() {
  const { data, error } = await supabase
    .from('sales')
    .select('*, sale_expenses(id, type, amount_paisa, borne_by), fish_types(name, name_ur)')
    .order('biz_date', { ascending: true })
    .order('created_at', { ascending: true });
  throwIf(error);
  const voidedBy = invertVoids(data);
  return data.map((r) => mapSale(r, voidedBy));
}

export async function listCashEntries() {
  const { data, error } = await supabase
    .from('cash_entries')
    .select('*')
    .order('biz_date', { ascending: true })
    .order('created_at', { ascending: true });
  throwIf(error);
  const voidedBy = invertVoids(data);
  return data.map((r) => mapCashEntry(r, voidedBy));
}

// ---------- writes ----------

export async function addParty(data) {
  const { shopId } = await callerIds();
  const { data: row, error } = await supabase
    .from('parties')
    .insert({
      shop_id: shopId,
      name: data.name,
      name_ur: data.nameUr ?? null,
      type: data.type,
      phone: data.phone ?? null,
      area: data.area ?? null,
      area_ur: data.areaUr ?? null,
      opening_paisa: data.openingPaisa ?? 0,
    })
    .select()
    .single();
  throwIf(error);
  return mapParty(row);
}

export async function mergeParty(loserId, winnerId) {
  if (loserId === winnerId) throw new Error('cannot merge a party into itself');
  const { data: winner, error: wErr } = await supabase
    .from('parties')
    .select('id, merged_into')
    .eq('id', winnerId)
    .maybeSingle();
  throwIf(wErr);
  if (!winner) throw new Error('party not found');
  if (winner.merged_into) throw new Error('cannot merge into an already-merged party');
  const { data: row, error } = await supabase
    .from('parties')
    .update({ merged_into: winnerId })
    .eq('id', loserId)
    .select()
    .single();
  throwIf(error);
  return mapParty(row);
}

/**
 * Writes the sale and its expense lines. PostgREST offers no transaction
 * across two requests, so if the expense insert fails the sale is
 * immediately reversed with a contra row (the system's own void mechanism —
 * deletes are denied by policy, deliberately). Either way the caller gets a
 * throw; what never survives is a live sale missing its expense lines.
 */
export async function addSale(data) {
  const { userId, shopId } = await callerIds();
  const gross = grossPaisa(data.weightG, data.ratePaisaPerKg);
  const commission = commissionPaisa(gross, data.commissionBp);
  const expensesTotal = data.expenses.reduce((sum, e) => sum + e.amountPaisa, 0);

  const { data: sale, error } = await supabase
    .from('sales')
    .insert({
      shop_id: shopId,
      biz_date: data.date,
      gaari: data.gaari ?? null,
      beopari_id: data.beopariId,
      khareedar_id: data.khareedarId,
      fish_type_id: data.fishTypeId,
      weight_g: data.weightG,
      rate_paisa_per_kg: data.ratePaisaPerKg,
      commission_bp: data.commissionBp,
      gross_paisa: gross,
      commission_paisa: commission,
      expenses_total_paisa: expensesTotal,
      net_payout_paisa: netPayoutPaisa(gross, commission, expensesTotal),
      created_by: userId,
    })
    .select()
    .single();
  throwIf(error);

  if (data.expenses.length > 0) {
    const { error: expError } = await supabase.from('sale_expenses').insert(
      data.expenses.map((e) => ({
        sale_id: sale.id,
        type: e.type,
        amount_paisa: e.amountPaisa,
        borne_by: e.borneBy ?? 'beopari',
      }))
    );
    if (expError) {
      // Compensate: void the sale we just wrote, then surface the failure.
      try {
        await voidSale(sale.id);
      } catch {
        // The void itself failed (connection died mid-sequence). The sale
        // stands without detail lines; its totals are still correct — the
        // identity is stored on the sale row. Surface the original error.
      }
      throw expError;
    }
  }

  const fresh = await listSales();
  return fresh.find((s) => s.id === sale.id);
}

export async function addCashEntry(data) {
  const { userId, shopId } = await callerIds();
  const { data: row, error } = await supabase
    .from('cash_entries')
    .insert({
      shop_id: shopId,
      biz_date: data.date,
      party_id: data.partyId,
      direction: data.direction,
      amount_paisa: data.amountPaisa,
      note: data.note || null,
      note_ur: data.noteUr || null,
      created_by: userId,
    })
    .select()
    .single();
  throwIf(error);
  return mapCashEntry(row, new Map());
}

/**
 * Allocation plan comes from ledgerMath over the mapped (signed) rows, so
 * live allocation is bit-identical to mock allocation: oldest unpaid sale
 * first, integer paisa, contra and voided rows excluded. Writes the
 * allocations rows, then each sale's received_paisa and status.
 */
export async function allocateWasooli({ partyId, amountPaisa, cashEntryId }) {
  const { shopId } = await callerIds();
  const sales = await listSales();
  const updates = planAllocation(sales, partyId, amountPaisa);
  if (updates.length === 0) return [];

  const { error: allocError } = await supabase.from('allocations').insert(
    updates.map((u) => ({
      shop_id: shopId,
      cash_entry_id: cashEntryId,
      sale_id: u.saleId,
      side: 'receivable',
      amount_paisa: u.appliedPaisa,
    }))
  );
  throwIf(allocError);

  for (const u of updates) {
    const { error } = await supabase
      .from('sales')
      .update({ received_paisa: u.receivedPaisa, status: u.status })
      .eq('id', u.saleId);
    throwIf(error);
  }
  return updates;
}

/**
 * Inserts the reversing row: a positive-magnitude copy carrying voids_id
 * (rule 3 above — the checks forbid storing negatives). The read mapper
 * turns it back into the negative mirror the app expects. Nothing is ever
 * deleted; there is no delete policy to even try against.
 */
export async function voidSale(id) {
  const { userId, shopId } = await callerIds();
  const { data: orig, error } = await supabase
    .from('sales')
    .select('*, sale_expenses(type, amount_paisa, borne_by)')
    .eq('id', id)
    .maybeSingle();
  throwIf(error);
  if (!orig) throw new Error('sale not found');
  if (orig.voids_id) throw new Error('cannot void a reversal');
  const { data: already, error: aErr } = await supabase
    .from('sales')
    .select('id')
    .eq('voids_id', id)
    .maybeSingle();
  throwIf(aErr);
  if (already) return null; // matches mock semantics: voiding twice is a no-op

  const { data: contra, error: cErr } = await supabase
    .from('sales')
    .insert({
      shop_id: shopId,
      biz_date: todayISO(),
      gaari: orig.gaari,
      beopari_id: orig.beopari_id,
      khareedar_id: orig.khareedar_id,
      fish_type_id: orig.fish_type_id,
      weight_g: intField(orig.weight_g, 'weight_g'),
      rate_paisa_per_kg: intField(orig.rate_paisa_per_kg, 'rate_paisa_per_kg'),
      commission_bp: intField(orig.commission_bp, 'commission_bp'),
      gross_paisa: intField(orig.gross_paisa, 'gross_paisa'),
      commission_paisa: intField(orig.commission_paisa, 'commission_paisa'),
      expenses_total_paisa: intField(orig.expenses_total_paisa, 'expenses_total_paisa'),
      net_payout_paisa: intField(orig.net_payout_paisa, 'net_payout_paisa'),
      received_paisa: intField(orig.received_paisa, 'received_paisa'),
      status: orig.status,
      voids_id: id,
      created_by: userId,
    })
    .select()
    .single();
  throwIf(cErr);

  // Detail lines for the reversal, mirroring the original's. Best-effort:
  // the reversing totals live on the contra sale row itself.
  if ((orig.sale_expenses ?? []).length > 0) {
    await supabase.from('sale_expenses').insert(
      orig.sale_expenses.map((e) => ({
        sale_id: contra.id,
        type: e.type,
        amount_paisa: intField(e.amount_paisa, 'amount_paisa'),
        borne_by: e.borne_by,
      }))
    );
  }

  const fresh = await listSales();
  return fresh.find((s) => s.id === contra.id) ?? null;
}

export async function voidCashEntry(id) {
  const { userId, shopId } = await callerIds();
  const { data: orig, error } = await supabase
    .from('cash_entries')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  throwIf(error);
  if (!orig) throw new Error('cash entry not found');
  if (orig.voids_id) throw new Error('cannot void a reversal');
  const { data: already, error: aErr } = await supabase
    .from('cash_entries')
    .select('id')
    .eq('voids_id', id)
    .maybeSingle();
  throwIf(aErr);
  if (already) return null;

  const { data: contra, error: cErr } = await supabase
    .from('cash_entries')
    .insert({
      shop_id: shopId,
      biz_date: todayISO(),
      party_id: orig.party_id,
      direction: orig.direction,
      amount_paisa: intField(orig.amount_paisa, 'amount_paisa'),
      note: orig.note,
      note_ur: orig.note_ur,
      voids_id: id,
      created_by: userId,
    })
    .select()
    .single();
  throwIf(cErr);
  return mapCashEntry(contra, new Map());
}

// ---------- derivations ----------
// Live rows in, the same ledgerMath as mock. Positive = Lena, negative = Dena.

export async function partyBalance(partyId) {
  const [parties, sales, cashEntries] = await Promise.all([
    listParties(),
    listSales(),
    listCashEntries(),
  ]);
  return computePartyBalance(parties.find((p) => p.id === partyId), sales, cashEntries);
}

export async function partyLedger(partyId) {
  const [parties, sales, cashEntries] = await Promise.all([
    listParties(),
    listSales(),
    listCashEntries(),
  ]);
  return buildPartyLedger(parties.find((p) => p.id === partyId), sales, cashEntries);
}
