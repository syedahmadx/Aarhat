// Pure ledger derivations shared by AppContext and every repo implementation.
// All money is integer paisa; nothing here does arithmetic beyond adding and
// negating whole paisa — derived figures come from utils/money.js upstream.

// A contra row reverses its original, so a voided pair always sums to zero.
// Neither row is skipped in balances: both are real entries and both stay
// visible; they cancel arithmetically.
export function isVoidRow(row) {
  return Boolean(row.voidsId) || Boolean(row.voidedBy);
}

/**
 * Balance for one party, in integer paisa.
 * Convention: positive = Lena (they owe us), negative = Dena (we owe them).
 * A sale debits the khareedar the gross and credits the beopari the net
 * payout. Wasooli (cash in) lowers a balance; payment (cash out) raises it.
 *
 * NOTE: a party with `mergedInto` set is treated as an ordinary party here.
 * Folding a merged party's entries into its survivor is not implemented yet.
 */
export function computePartyBalance(party, sales, cashEntries) {
  if (!party) return 0;
  let bal = party.openingPaisa;
  for (const s of sales) {
    if (s.khareedarId === party.id) bal += s.grossPaisa;
    if (s.beopariId === party.id) bal -= s.netPayoutPaisa;
  }
  for (const c of cashEntries) {
    if (c.partyId === party.id) {
      bal += c.direction === 'wasooli' ? -c.amountPaisa : c.amountPaisa;
    }
  }
  return bal;
}

/**
 * Ledger rows for a party's khata, chronological, with running balance.
 * Rows carry a translation key + params rather than a baked English string,
 * so the khata renders in whichever language is active.
 */
export function buildPartyLedger(party, sales, cashEntries) {
  if (!party) return [];
  const rows = [];
  for (const s of sales) {
    if (s.khareedarId === party.id) {
      rows.push({
        id: `sale-${s.id}`, date: s.date, time: s.time,
        descKey: 'kd.saleDesc',
        descParams: { fish: s.fishType, fishUr: s.fishTypeUr, weightG: s.weightG, ratePaisaPerKg: s.ratePaisaPerKg, gaari: s.gaari },
        debit: s.grossPaisa, credit: 0, status: s.status,
        voidsId: s.voidsId, voidedBy: s.voidedBy,
      });
    }
    if (s.beopariId === party.id) {
      rows.push({
        id: `sale-b-${s.id}`, date: s.date, time: s.time,
        descKey: 'kd.payoutDesc',
        descParams: { fish: s.fishType, fishUr: s.fishTypeUr, weightG: s.weightG, gaari: s.gaari },
        debit: 0, credit: s.netPayoutPaisa, status: s.status,
        voidsId: s.voidsId, voidedBy: s.voidedBy,
      });
    }
  }
  for (const c of cashEntries) {
    if (c.partyId === party.id) {
      rows.push({
        id: `cash-${c.id}`, date: c.date, time: c.time,
        cash: c,
        debit: c.direction === 'payment' ? c.amountPaisa : 0,
        credit: c.direction === 'wasooli' ? c.amountPaisa : 0,
        voidsId: c.voidsId, voidedBy: c.voidedBy,
      });
    }
  }
  rows.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  let bal = party.openingPaisa;
  return rows.map((r) => {
    bal += r.debit - r.credit;
    return { ...r, balance: bal };
  });
}

/**
 * Plans how a wasooli spreads across a khareedar's unpaid sales, oldest
 * first, in integer paisa. Pure: returns the per-sale updates and never
 * mutates. Contra rows carry a negative gross and a voided original is no
 * longer owed — allocating against either would hand the remaining cash back
 * to itself and over-allocate the rest, so both are skipped.
 *
 * @returns {Array<{saleId, appliedPaisa, receivedPaisa, status}>}
 */
export function planAllocation(sales, partyId, amountPaisa) {
  let remaining = amountPaisa;
  const ordered = [...sales].sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  const updates = [];
  for (const s of ordered) {
    if (remaining <= 0) break;
    if (s.khareedarId !== partyId || s.status === 'Paid') continue;
    if (isVoidRow(s)) continue;
    const due = s.grossPaisa - s.receivedPaisa;
    if (due <= 0) continue;
    const applied = Math.min(due, remaining);
    remaining -= applied;
    const received = s.receivedPaisa + applied;
    updates.push({
      saleId: s.id,
      appliedPaisa: applied,
      receivedPaisa: received,
      status: received >= s.grossPaisa ? 'Paid' : received > 0 ? 'Partial' : 'Pending',
    });
  }
  return updates;
}

// A void never deletes. It posts a mirror-image row dated the day of the
// void; the original stays visible, struck through. Every amount is negated,
// so the pair sums to zero in any balance or report that adds rows up.

export function buildContraSale(original, id, date, time) {
  return {
    ...original,
    id, date, time,
    weightG: -original.weightG,
    expenses: original.expenses.map((e) => ({ ...e, amountPaisa: -e.amountPaisa })),
    grossPaisa: -original.grossPaisa,
    commissionPaisa: -original.commissionPaisa,
    expensesTotalPaisa: -original.expensesTotalPaisa,
    netPayoutPaisa: -original.netPayoutPaisa,
    receivedPaisa: -original.receivedPaisa,
    voidsId: original.id,
    voidedBy: null,
  };
}

export function buildContraCash(original, id, date, time) {
  return {
    ...original,
    id, date, time,
    amountPaisa: -original.amountPaisa,
    voidsId: original.id,
    voidedBy: null,
  };
}
