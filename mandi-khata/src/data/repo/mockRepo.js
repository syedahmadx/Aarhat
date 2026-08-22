import { initialParties, initialSales, initialCashEntries, FISH_TYPES } from '../mockData';
import { grossPaisa, commissionPaisa, netPayoutPaisa } from '../../utils/money';
import { todayISO } from '../../utils/format';
import {
  isVoidRow,
  computePartyBalance,
  buildPartyLedger,
  planAllocation,
  buildContraSale,
  buildContraCash,
} from '../ledgerMath';

// In-memory implementation of the repo interface. Session-lifetime only, by
// design: this is the demo data source, and everything resets on reload.
// The fixtures are cloned so nothing here mutates the exported mock arrays
// that the tests assert against.

// Urdu names for the default fish list, matching migration 0004's seed.
const FISH_UR = { Rohu: 'روہو', Thaila: 'تھیلا', Jhinga: 'جھینگا', Mori: 'موری', 'Silver Carp': 'سلور کارپ' };

let parties = structuredClone(initialParties);
// Fixtures predate fish_types-as-rows: they carry only the name. Decorate so
// fixture rows and newly created rows share one shape.
let sales = structuredClone(initialSales).map((s) => ({
  fishTypeId: s.fishType,
  fishTypeUr: FISH_UR[s.fishType] ?? null,
  ...s,
}));
let cashEntries = structuredClone(initialCashEntries);
// Mock fish types use the name as the id; the supabase repo has real uuids.
let fishTypes = FISH_TYPES.map((name) => ({ id: name, name, nameUr: FISH_UR[name] ?? null }));

let seq = 1;
const newId = (prefix) => `${prefix}${Date.now()}_${seq++}`;

function hhmm(d = new Date()) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Copies out, so callers can never mutate repo state through a returned row.
export async function listParties() {
  return structuredClone(parties);
}

export async function listFishTypes() {
  return structuredClone(fishTypes);
}

export async function listSales() {
  return structuredClone(sales);
}

export async function listCashEntries() {
  return structuredClone(cashEntries);
}

export async function addParty(data) {
  const p = {
    nameUr: null, phone: null, area: null, areaUr: null,
    openingPaisa: 0,
    mergedInto: null,
    ...data,
    id: newId('p'),
  };
  parties = [...parties, p];
  return structuredClone(p);
}

// Merging points the loser at the winner; nothing is deleted, so old rows
// keep resolving. Folding entries into the survivor is not implemented.
export async function mergeParty(loserId, winnerId) {
  const loser = parties.find((p) => p.id === loserId);
  const winner = parties.find((p) => p.id === winnerId);
  if (!loser || !winner) throw new Error('party not found');
  if (loserId === winnerId) throw new Error('cannot merge a party into itself');
  if (winner.mergedInto) throw new Error('cannot merge into an already-merged party');
  parties = parties.map((p) => (p.id === loserId ? { ...p, mergedInto: winnerId } : p));
  return structuredClone(parties.find((p) => p.id === loserId));
}

/**
 * @param {object} data date, gaari, beopariId, khareedarId, fishTypeId,
 *                      weightG, ratePaisaPerKg, commissionBp integers;
 *                      expenses is [{ type, amountPaisa }]
 */
export async function addSale(data) {
  const fish = fishTypes.find((f) => f.id === data.fishTypeId);
  if (!fish) throw new Error('unknown fish type');
  const gross = grossPaisa(data.weightG, data.ratePaisaPerKg);
  const commission = commissionPaisa(gross, data.commissionBp);
  const expensesTotal = data.expenses.reduce((sum, e) => sum + e.amountPaisa, 0);
  const s = {
    ...data,
    id: newId('s'),
    time: hhmm(),
    fishType: fish.name,
    fishTypeUr: fish.nameUr,
    grossPaisa: gross,
    commissionPaisa: commission,
    expensesTotalPaisa: expensesTotal,
    netPayoutPaisa: netPayoutPaisa(gross, commission, expensesTotal),
    status: 'Pending',
    receivedPaisa: 0,
    voidsId: null,
    voidedBy: null,
  };
  sales = [...sales, s];
  return structuredClone(s);
}

export async function addCashEntry(data) {
  const c = {
    note: null, noteUr: null,
    ...data,
    id: newId('c'),
    time: hhmm(),
    voidsId: null,
    voidedBy: null,
  };
  cashEntries = [...cashEntries, c];
  return structuredClone(c);
}

/**
 * Spreads a wasooli across the party's unpaid sales, oldest first, moving
 * statuses Pending → Partial → Paid. The plan comes from ledgerMath so the
 * supabase implementation allocates identically.
 */
export async function allocateWasooli({ partyId, amountPaisa }) {
  const updates = planAllocation(sales, partyId, amountPaisa);
  if (updates.length > 0) {
    const byId = new Map(updates.map((u) => [u.saleId, u]));
    sales = sales.map((s) => {
      const u = byId.get(s.id);
      return u ? { ...s, receivedPaisa: u.receivedPaisa, status: u.status } : s;
    });
  }
  return updates;
}

// Voiding never removes a row: a reversing contra entry dated today is
// appended and the original marked, so the day book keeps its history and
// any parchi already handed to a party still reconciles.
export async function voidSale(id) {
  const original = sales.find((s) => s.id === id);
  if (!original || isVoidRow(original)) return null;
  const contra = buildContraSale(original, newId('s'), todayISO(), hhmm());
  sales = [...sales.map((s) => (s.id === id ? { ...s, voidedBy: contra.id } : s)), contra];
  return structuredClone(contra);
}

export async function voidCashEntry(id) {
  const original = cashEntries.find((c) => c.id === id);
  if (!original || isVoidRow(original)) return null;
  const contra = buildContraCash(original, newId('c'), todayISO(), hhmm());
  cashEntries = [...cashEntries.map((c) => (c.id === id ? { ...c, voidedBy: contra.id } : c)), contra];
  return structuredClone(contra);
}

export async function partyBalance(partyId) {
  const party = parties.find((p) => p.id === partyId);
  return computePartyBalance(party, sales, cashEntries);
}

export async function partyLedger(partyId) {
  const party = parties.find((p) => p.id === partyId);
  return buildPartyLedger(party, sales, cashEntries);
}
