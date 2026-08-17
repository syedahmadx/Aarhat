import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLang } from '../i18n/LanguageContext';
import { todayISO } from '../utils/format';
import StatusBadge from '../components/StatusBadge';
import TypeBadge from '../components/TypeBadge';
import DeleteButton from '../components/DeleteButton';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

const CHIPS = [
  { key: 'All', label: 'roz.all' },
  { key: 'Sales', label: 'roz.sales' },
  { key: 'Wasooli', label: 'roz.wasooli' },
  { key: 'Payments', label: 'roz.payments' },
];

export default function Roznamcha() {
  const { sales, cashEntries, partyById, deleteSale, deleteCashEntry, showToast } = useApp();
  const { t, fmt, partyName, cashNote } = useLang();
  const [date, setDate] = useState(todayISO());
  const [chip, setChip] = useState('All');
  const [toDelete, setToDelete] = useState(null);

  const entries = useMemo(() => {
    const rows = [];
    for (const s of sales) {
      if (s.date !== date) continue;
      rows.push({
        kind: 'Sale', id: s.id, time: s.time,
        parties: `${partyName(partyById(s.beopariId))} → ${partyName(partyById(s.khareedarId))}`,
        detail: t('kd.saleDesc', { fish: t(`fish.${s.fishType}`), weight: s.weight, rate: s.rate, gaari: s.gaari }),
        amount: s.gross, status: s.status, cashIn: 0, cashOut: 0,
      });
    }
    for (const c of cashEntries) {
      if (c.date !== date) continue;
      const isIn = c.direction === 'wasooli';
      rows.push({
        kind: isIn ? 'Wasooli' : 'Payment', id: c.id, time: c.time,
        parties: partyName(partyById(c.partyId)) || '—',
        detail: cashNote(c) || t(isIn ? 'cash.noteWasooli' : 'cash.notePayment'),
        amount: c.amount, status: null,
        cashIn: isIn ? c.amount : 0, cashOut: isIn ? 0 : c.amount,
      });
    }
    rows.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    return rows;
  }, [sales, cashEntries, date, partyById, partyName, cashNote, t]);

  const filtered = entries.filter((e) => {
    if (chip === 'All') return true;
    if (chip === 'Sales') return e.kind === 'Sale';
    if (chip === 'Wasooli') return e.kind === 'Wasooli';
    return e.kind === 'Payment';
  });

  const cashIn = entries.reduce((s, e) => s + e.cashIn, 0);
  const cashOut = entries.reduce((s, e) => s + e.cashOut, 0);

  function confirmDelete() {
    if (!toDelete) return;
    if (toDelete.kind === 'Sale') deleteSale(toDelete.id);
    else deleteCashEntry(toDelete.id);
    setToDelete(null);
    showToast(t('toast.entryDeleted'));
  }

  const activeChipLabel = t(CHIPS.find((c) => c.key === chip)?.label || 'roz.all');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('roz.title')}</h1>
          <p className="text-sm text-gray-500">{t('roz.subtitle', { date: fmt.date(date) })}</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="latin rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-800 outline-none focus:border-primary-500"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.key}
            onClick={() => setChip(c.key)}
            className={
              chip === c.key
                ? 'rounded-full bg-primary-700 px-4 py-2 text-sm font-semibold text-white'
                : 'rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:border-primary-400'
            }
          >
            {t(c.label)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={t('roz.emptyTitle')}
          subtitle={chip === 'All' ? t('roz.emptySub') : t('roz.emptyFilterSub', { chip: activeChipLabel })}
          action={
            <Link to="/new-sale" className="rounded-lg bg-primary-700 px-5 py-3 text-sm font-bold text-white hover:bg-primary-800">
              {t('roz.addSale')}
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <ul className="divide-y divide-gray-100">
            {filtered.map((e) => (
              <li key={`${e.kind}-${e.id}`} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <span className="latin w-16 shrink-0 text-xs font-medium text-gray-400">{fmt.time(e.time)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <TypeBadge type={e.kind} />
                    <span className="truncate text-sm font-semibold text-gray-900">{e.parties}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500">{e.detail}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-end">
                    <p className={`latin text-sm font-bold ${e.kind === 'Payment' ? 'text-red-600' : e.kind === 'Wasooli' ? 'text-green-700' : 'text-gray-900'}`}>
                      {fmt.rs(e.amount)}
                    </p>
                    {e.status && <StatusBadge status={e.status} />}
                  </div>
                  <DeleteButton onDelete={() => setToDelete({ kind: e.kind === 'Sale' ? 'Sale' : 'Cash', id: e.id, label: `${t(`type.${e.kind}`)} — ${fmt.rs(e.amount)}` })} />
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-end gap-6 border-t border-gray-200 bg-gray-50 px-5 py-3">
            <div className="text-end">
              <p className="text-xs font-medium text-gray-500">{t('dash.cashIn')}</p>
              <p className="latin text-sm font-bold text-green-700">{fmt.rs(cashIn)}</p>
            </div>
            <div className="text-end">
              <p className="text-xs font-medium text-gray-500">{t('dash.cashOut')}</p>
              <p className="latin text-sm font-bold text-red-600">{fmt.rs(cashOut)}</p>
            </div>
            <div className="text-end">
              <p className="text-xs font-medium text-gray-500">{t('roz.net')}</p>
              <p className={`latin text-sm font-bold ${cashIn - cashOut >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt.rs(cashIn - cashOut)}</p>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title={t('roz.deleteTitle')}
        message={toDelete ? t('roz.deleteMsg', { label: toDelete.label }) : ''}
        confirmLabel={t('common.delete')}
        danger
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
