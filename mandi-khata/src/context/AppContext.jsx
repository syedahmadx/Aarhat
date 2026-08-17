import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { initialParties, initialSales, initialCashEntries } from '../data/mockData';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [role, setRole] = useState('malik'); // 'malik' | 'munshi'
  const [parties] = useState(initialParties);
  const [sales, setSales] = useState(initialSales);
  const [cashEntries, setCashEntries] = useState(initialCashEntries);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, tone = 'success') => {
    setToast({ message, tone, key: Date.now() });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const partyById = useCallback((id) => parties.find((p) => p.id === id), [parties]);

  // Balance convention: positive = Lena (they owe us), negative = Dena (we owe them).
  // Sale: khareedar owes gross; we owe beopari the net payout.
  // Wasooli (cash received from party) lowers their balance; Payment (paid out) raises it.
  const partyBalance = useCallback(
    (partyId) => {
      const p = partyById(partyId);
      if (!p) return 0;
      let bal = p.openingBalance;
      for (const s of sales) {
        if (s.khareedarId === partyId) bal += s.gross;
        if (s.beopariId === partyId) bal -= s.netPayout;
      }
      for (const c of cashEntries) {
        if (c.partyId === partyId) bal += c.direction === 'wasooli' ? -c.amount : c.amount;
      }
      return bal;
    },
    [partyById, sales, cashEntries]
  );

  // Ledger rows for a party's khata, chronological, with running balance.
  const partyLedger = useCallback(
    (partyId) => {
      const p = partyById(partyId);
      if (!p) return [];
      const rows = [];
      for (const s of sales) {
        if (s.khareedarId === partyId) {
          rows.push({
            id: `sale-${s.id}`, date: s.date, time: s.time,
            description: `${s.fishType} ${s.weight}kg @ Rs.${s.rate} (Gaari ${s.gaari})`,
            debit: s.gross, credit: 0, status: s.status,
          });
        }
        if (s.beopariId === partyId) {
          rows.push({
            id: `sale-b-${s.id}`, date: s.date, time: s.time,
            description: `Net payout — ${s.fishType} ${s.weight}kg (Gaari ${s.gaari})`,
            debit: 0, credit: s.netPayout, status: s.status,
          });
        }
      }
      for (const c of cashEntries) {
        if (c.partyId === partyId) {
          rows.push({
            id: `cash-${c.id}`, date: c.date, time: c.time,
            description: c.direction === 'wasooli' ? `Wasooli${c.note ? ' — ' + c.note : ''}` : `Payment${c.note ? ' — ' + c.note : ''}`,
            debit: c.direction === 'payment' ? c.amount : 0,
            credit: c.direction === 'wasooli' ? c.amount : 0,
          });
        }
      }
      rows.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
      let bal = p.openingBalance;
      return rows.map((r) => {
        bal += r.debit - r.credit;
        return { ...r, balance: bal };
      });
    },
    [partyById, sales, cashEntries]
  );

  const addSale = useCallback(
    (data) => {
      const gross = data.weight * data.rate;
      const commission = Math.round((gross * data.commissionPct) / 100);
      const totalExpenses = data.expenses.reduce((s, e) => s + e.amount, 0);
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const s = {
        ...data,
        id: `s${Date.now()}`,
        time,
        gross,
        commission,
        totalExpenses,
        netPayout: gross - commission - totalExpenses,
        status: 'Pending',
        receivedAmount: 0,
      };
      setSales((prev) => [...prev, s]);
      return s;
    },
    []
  );

  // Records a cash entry. A wasooli from a khareedar is also allocated against
  // that party's unpaid sales (oldest first) so statuses move Pending → Partial → Paid.
  const addCashEntry = useCallback(
    (data) => {
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const c = { ...data, id: `c${Date.now()}`, time };
      setCashEntries((prev) => [...prev, c]);
      if (c.direction === 'wasooli') {
        setSales((prev) => {
          let remaining = c.amount;
          const ordered = [...prev].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
          const updated = new Map();
          for (const s of ordered) {
            if (remaining <= 0) break;
            if (s.khareedarId !== c.partyId || s.status === 'Paid') continue;
            const due = s.gross - s.receivedAmount;
            const applied = Math.min(due, remaining);
            remaining -= applied;
            const received = s.receivedAmount + applied;
            updated.set(s.id, {
              ...s,
              receivedAmount: received,
              status: received >= s.gross ? 'Paid' : received > 0 ? 'Partial' : 'Pending',
            });
          }
          return prev.map((s) => updated.get(s.id) || s);
        });
      }
      return c;
    },
    []
  );

  const deleteSale = useCallback((id) => setSales((prev) => prev.filter((s) => s.id !== id)), []);
  const deleteCashEntry = useCallback((id) => setCashEntries((prev) => prev.filter((c) => c.id !== id)), []);

  const value = useMemo(
    () => ({
      role, setRole,
      parties, sales, cashEntries,
      partyById, partyBalance, partyLedger,
      addSale, addCashEntry, deleteSale, deleteCashEntry,
      toast, showToast,
    }),
    [role, parties, sales, cashEntries, partyById, partyBalance, partyLedger, addSale, addCashEntry, deleteSale, deleteCashEntry, toast, showToast]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
