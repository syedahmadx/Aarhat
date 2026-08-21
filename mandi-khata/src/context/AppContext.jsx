import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { initialParties, initialSales, initialCashEntries } from '../data/mockData';
import { grossPaisa, commissionPaisa, netPayoutPaisa } from '../utils/money';
import { todayISO } from '../utils/format';

const AppContext = createContext(null);

// All money below is integer paisa, all weights integer grams. Nothing in this
// file does its own arithmetic on an amount beyond adding and negating whole
// paisa — every derived figure comes from utils/money.js.

function hhmm(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// A contra row reverses its original, so a voided pair always sums to zero.
// Neither row is skipped here: both are real entries and both stay visible.
function isVoidRow(row) {
  return Boolean(row.voids_id) || Boolean(row.voided_by);
}

/**
 * Balance for one party, in integer paisa.
 * Convention: positive = Lena (they owe us), negative = Dena (we owe them).
 * A sale debits the khareedar the gross and credits the beopari the net payout.
 * Wasooli (cash in) lowers a balance; payment (cash out) raises it.
 *
 * Exported as a pure function so the migration test can check it directly
 * against the pre-conversion float fixtures.
 *
 * NOTE: a party with `merged_into` set is treated as an ordinary party here.
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

export function AppProvider({ children }) {
  const [role, setRole] = useState('malik'); // 'malik' | 'munshi'
  const [parties, setParties] = useState(initialParties);
  const [sales, setSales] = useState(initialSales);
  const [cashEntries, setCashEntries] = useState(initialCashEntries);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, tone = 'success') => {
    setToast({ message, tone, key: Date.now() });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const partyById = useCallback((id) => parties.find((p) => p.id === id), [parties]);

  const partyBalance = useCallback(
    (partyId) => computePartyBalance(partyById(partyId), sales, cashEntries),
    [partyById, sales, cashEntries]
  );

  // Ledger rows for a party's khata, chronological, with running balance.
  const partyLedger = useCallback(
    (partyId) => {
      const p = partyById(partyId);
      if (!p) return [];
      const rows = [];
      // Rows carry a translation key + params rather than a baked English
      // string, so the khata renders in whichever language is active.
      for (const s of sales) {
        if (s.khareedarId === partyId) {
          rows.push({
            id: `sale-${s.id}`, date: s.date, time: s.time,
            descKey: 'kd.saleDesc',
            descParams: { fish: s.fishType, weightG: s.weightG, ratePaisaPerKg: s.ratePaisaPerKg, gaari: s.gaari },
            debit: s.grossPaisa, credit: 0, status: s.status,
            voids_id: s.voids_id, voided_by: s.voided_by,
          });
        }
        if (s.beopariId === partyId) {
          rows.push({
            id: `sale-b-${s.id}`, date: s.date, time: s.time,
            descKey: 'kd.payoutDesc',
            descParams: { fish: s.fishType, weightG: s.weightG, gaari: s.gaari },
            debit: 0, credit: s.netPayoutPaisa, status: s.status,
            voids_id: s.voids_id, voided_by: s.voided_by,
          });
        }
      }
      for (const c of cashEntries) {
        if (c.partyId === partyId) {
          rows.push({
            id: `cash-${c.id}`, date: c.date, time: c.time,
            cash: c,
            debit: c.direction === 'payment' ? c.amountPaisa : 0,
            credit: c.direction === 'wasooli' ? c.amountPaisa : 0,
            voids_id: c.voids_id, voided_by: c.voided_by,
          });
        }
      }
      rows.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
      let bal = p.openingPaisa;
      return rows.map((r) => {
        bal += r.debit - r.credit;
        return { ...r, balance: bal };
      });
    },
    [partyById, sales, cashEntries]
  );

  /**
   * @param {object} data weightG, ratePaisaPerKg, commissionBp integers;
   *                      expenses is [{ type, amountPaisa }]
   */
  const addSale = useCallback((data) => {
    const gross = grossPaisa(data.weightG, data.ratePaisaPerKg);
    const commission = commissionPaisa(gross, data.commissionBp);
    const expensesTotal = data.expenses.reduce((sum, e) => sum + e.amountPaisa, 0);
    const s = {
      ...data,
      id: `s${Date.now()}`,
      time: hhmm(new Date()),
      grossPaisa: gross,
      commissionPaisa: commission,
      expensesTotalPaisa: expensesTotal,
      netPayoutPaisa: netPayoutPaisa(gross, commission, expensesTotal),
      status: 'Pending',
      receivedPaisa: 0,
      voids_id: null,
      voided_by: null,
    };
    setSales((prev) => [...prev, s]);
    return s;
  }, []);

  const addParty = useCallback((data) => {
    const p = {
      openingPaisa: 0,
      merged_into: null,
      ...data,
      id: `p${Date.now()}`,
    };
    setParties((prev) => [...prev, p]);
    return p;
  }, []);

  // Records a cash entry. A wasooli from a khareedar is also allocated against
  // that party's unpaid sales (oldest first) so statuses move Pending → Partial → Paid.
  const addCashEntry = useCallback((data) => {
    const c = {
      ...data,
      id: `c${Date.now()}`,
      time: hhmm(new Date()),
      voids_id: null,
      voided_by: null,
    };
    setCashEntries((prev) => [...prev, c]);
    if (c.direction === 'wasooli') {
      setSales((prev) => {
        let remaining = c.amountPaisa;
        const ordered = [...prev].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
        const updated = new Map();
        for (const s of ordered) {
          if (remaining <= 0) break;
          if (s.khareedarId !== c.partyId || s.status === 'Paid') continue;
          // A contra row carries a negative gross and a voided original is no
          // longer owed. Allocating against either would hand the remaining
          // cash back to itself and over-allocate the rest of the sales.
          if (isVoidRow(s)) continue;
          const due = s.grossPaisa - s.receivedPaisa;
          if (due <= 0) continue;
          const applied = Math.min(due, remaining);
          remaining -= applied;
          const received = s.receivedPaisa + applied;
          updated.set(s.id, {
            ...s,
            receivedPaisa: received,
            status: received >= s.grossPaisa ? 'Paid' : received > 0 ? 'Partial' : 'Pending',
          });
        }
        return prev.map((s) => updated.get(s.id) || s);
      });
    }
    return c;
  }, []);

  // Voiding never removes a row. It appends a reversing contra entry dated
  // today and marks the original, so the day book keeps its history and any
  // parchi already handed to a party still reconciles.
  const voidSale = useCallback((id) => {
    setSales((prev) => {
      const original = prev.find((s) => s.id === id);
      if (!original || isVoidRow(original)) return prev;
      const contraId = `s${Date.now()}`;
      const contra = {
        ...original,
        id: contraId,
        date: todayISO(),
        time: hhmm(new Date()),
        weightG: -original.weightG,
        expenses: original.expenses.map((e) => ({ ...e, amountPaisa: -e.amountPaisa })),
        grossPaisa: -original.grossPaisa,
        commissionPaisa: -original.commissionPaisa,
        expensesTotalPaisa: -original.expensesTotalPaisa,
        netPayoutPaisa: -original.netPayoutPaisa,
        receivedPaisa: -original.receivedPaisa,
        voids_id: original.id,
        voided_by: null,
      };
      return [...prev.map((s) => (s.id === id ? { ...s, voided_by: contraId } : s)), contra];
    });
  }, []);

  const voidCashEntry = useCallback((id) => {
    setCashEntries((prev) => {
      const original = prev.find((c) => c.id === id);
      if (!original || isVoidRow(original)) return prev;
      const contraId = `c${Date.now()}`;
      const contra = {
        ...original,
        id: contraId,
        date: todayISO(),
        time: hhmm(new Date()),
        amountPaisa: -original.amountPaisa,
        voids_id: original.id,
        voided_by: null,
      };
      return [...prev.map((c) => (c.id === id ? { ...c, voided_by: contraId } : c)), contra];
    });
  }, []);

  const value = useMemo(
    () => ({
      role, setRole,
      parties, sales, cashEntries,
      partyById, partyBalance, partyLedger,
      addSale, addParty, addCashEntry, voidSale, voidCashEntry,
      toast, showToast,
    }),
    [role, parties, sales, cashEntries, partyById, partyBalance, partyLedger, addSale, addParty, addCashEntry, voidSale, voidCashEntry, toast, showToast]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
