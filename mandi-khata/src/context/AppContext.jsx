import { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import * as repo from '../data/repo';
import { computePartyBalance, buildPartyLedger } from '../data/ledgerMath';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

// All money below is integer paisa, all weights integer grams. This context
// owns no ledger logic of its own any more: rows come from the repo
// interface (src/data/repo — mock by default, supabase when
// VITE_DATA_SOURCE=supabase), and derivations come from ledgerMath.
//
// Balances and ledgers are computed synchronously over the loaded row set
// rather than awaited per-party from the repo: the khata list calls
// partyBalance once per party in render, and the numbers on screen must be
// consistent with the rows on screen — same snapshot, same answer.

export function AppProvider({ children }) {
  const [parties, setParties] = useState([]);
  const [fishTypes, setFishTypes] = useState([]);
  const [sales, setSales] = useState([]);
  const [cashEntries, setCashEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // In supabase mode every read is RLS-scoped to the signed-in user's shop,
  // so the row set changes identity when the shop does (sign-in, sign-out,
  // onboarding). Mock mode ignores this and loads once.
  const { shopId, role: profileRole } = useAuth();

  // The ONLY source of role is the signed-in user's profiles row. There is
  // no setter: a user cannot choose their own role. Mock/demo sessions have
  // no profile and run as malik so the demo stays fully usable.
  const role = profileRole ?? 'malik';

  // Mirror the role into the repo layer so repo.voidSale/voidCashEntry can
  // refuse a munshi even if a future caller bypasses this context.
  useEffect(() => {
    repo.setActiveRole(role);
  }, [role]);

  const mounted = useRef(true);
  const loadSeq = useRef(0);

  const reload = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    setError(null);
    try {
      const [p, f, s, c] = await Promise.all([
        repo.listParties(),
        repo.listFishTypes(),
        repo.listSales(),
        repo.listCashEntries(),
      ]);
      if (!mounted.current || seq !== loadSeq.current) return;
      setParties(p);
      setFishTypes(f);
      setSales(s);
      setCashEntries(c);
    } catch (e) {
      if (!mounted.current || seq !== loadSeq.current) return;
      setError(e);
    } finally {
      if (mounted.current && seq === loadSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    reload();
    return () => {
      mounted.current = false;
    };
  }, [reload, shopId]);

  const showToast = useCallback((message, tone = 'success') => {
    setToast({ message, tone, key: Date.now() });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const partyById = useCallback((id) => parties.find((p) => p.id === id), [parties]);

  const partyBalance = useCallback(
    (partyId) => computePartyBalance(partyById(partyId), sales, cashEntries),
    [partyById, sales, cashEntries]
  );

  const partyLedger = useCallback(
    (partyId) => buildPartyLedger(partyById(partyId), sales, cashEntries),
    [partyById, sales, cashEntries]
  );

  // Mutations: write through the repo, then re-read the affected slices so
  // what the screens show is what the data source actually holds — the same
  // code path for mock and live.
  const refreshSales = useCallback(async () => setSales(await repo.listSales()), []);
  const refreshCash = useCallback(async () => setCashEntries(await repo.listCashEntries()), []);
  const refreshParties = useCallback(async () => setParties(await repo.listParties()), []);

  /**
   * @param {object} data date, gaari, beopariId, khareedarId, fishTypeId,
   *                      weightG, ratePaisaPerKg, commissionBp integers;
   *                      expenses is [{ type, amountPaisa }]
   */
  const addSale = useCallback(
    async (data) => {
      // Mock fish ids are the names themselves, so screens that still send
      // fishType (the name) keep working until they switch to fishTypeId.
      const s = await repo.addSale({ ...data, fishTypeId: data.fishTypeId ?? data.fishType });
      await refreshSales();
      return s;
    },
    [refreshSales]
  );

  const addParty = useCallback(
    async (data) => {
      const p = await repo.addParty(data);
      await refreshParties();
      return p;
    },
    [refreshParties]
  );

  const mergeParty = useCallback(
    async (loserId, winnerId) => {
      const p = await repo.mergeParty(loserId, winnerId);
      await refreshParties();
      return p;
    },
    [refreshParties]
  );

  // Records a cash entry. A wasooli is also allocated against the party's
  // unpaid sales (oldest first) so statuses move Pending → Partial → Paid.
  const addCashEntry = useCallback(
    async (data) => {
      const c = await repo.addCashEntry(data);
      if (c.direction === 'wasooli') {
        await repo.allocateWasooli({ partyId: c.partyId, amountPaisa: c.amountPaisa, cashEntryId: c.id });
      }
      await Promise.all([refreshCash(), refreshSales()]);
      return c;
    },
    [refreshCash, refreshSales]
  );

  // Voiding never removes a row; the repo appends a reversing contra entry
  // dated today and marks the original.
  const voidSale = useCallback(
    async (id) => {
      const contra = await repo.voidSale(id);
      await refreshSales();
      return contra;
    },
    [refreshSales]
  );

  const voidCashEntry = useCallback(
    async (id) => {
      const contra = await repo.voidCashEntry(id);
      await refreshCash();
      return contra;
    },
    [refreshCash]
  );

  const value = useMemo(
    () => ({
      role,
      parties, fishTypes, sales, cashEntries,
      loading, error, reload,
      partyById, partyBalance, partyLedger,
      addSale, addParty, mergeParty, addCashEntry, voidSale, voidCashEntry,
      toast, showToast,
    }),
    [role, parties, fishTypes, sales, cashEntries, loading, error, reload, partyById, partyBalance, partyLedger, addSale, addParty, mergeParty, addCashEntry, voidSale, voidCashEntry, toast, showToast]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
