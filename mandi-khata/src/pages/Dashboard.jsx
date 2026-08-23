import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLang } from '../i18n/LanguageContext';
import { todayISO, daysAgoISO } from '../utils/format';
import TypeBadge from '../components/TypeBadge';
import EmptyState from '../components/EmptyState';
import { SalesByFishChart, CashFlowChart } from '../components/charts/LedgerCharts';

function SummaryCard({ label, value, tone, icon }) {
  const tones = {
    teal: 'bg-primary-100 text-primary-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={icon} /></svg>
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-gray-500">{label}</p>
          <p className="latin truncate text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { sales, cashEntries, parties, partyBalance } = useApp();
  const { t, fmt, partyName } = useLang();
  const [date, setDate] = useState(todayISO());

  // A voided entry and its reversal both stay in the ledger. Dropping the
  // pair is the same arithmetic as keeping both (they cancel) but it also
  // keeps them out of the counts.
  const live = (r) => !r.voidsId && !r.voidedBy;
  const daySales = useMemo(() => sales.filter((s) => s.date === date && live(s)), [sales, date]);
  const dayCash = useMemo(() => cashEntries.filter((c) => c.date === date && live(c)), [cashEntries, date]);

  const totalSales = daySales.reduce((s, x) => s + x.grossPaisa, 0);
  const commission = daySales.reduce((s, x) => s + x.commissionPaisa, 0);
  const cashIn = dayCash.filter((c) => c.direction === 'wasooli').reduce((s, c) => s + c.amountPaisa, 0);
  const cashOut = dayCash.filter((c) => c.direction === 'payment').reduce((s, c) => s + c.amountPaisa, 0);

  // Top 5 parties by outstanding receivable (Lena)
  const topUdhaar = useMemo(
    () =>
      parties
        .filter((p) => !p.mergedInto)
        .map((p) => ({ ...p, balance: partyBalance(p.id) }))
        .filter((p) => p.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 5),
    [parties, partyBalance]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('dash.title')}</h1>
          <p className="text-sm text-gray-500">{fmt.date(date)}</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="latin rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-800 outline-none focus:border-primary-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label={t('dash.todaySales')} value={fmt.rs(totalSales)} tone="teal" icon="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72" />
        <SummaryCard label={t('dash.cashIn')} value={fmt.rs(cashIn)} tone="green" icon="M12 4.5v15m0 0 6.75-6.75M12 19.5l-6.75-6.75" />
        <SummaryCard label={t('dash.cashOut')} value={fmt.rs(cashOut)} tone="red" icon="M12 19.5v-15m0 0-6.75 6.75M12 4.5l6.75 6.75" />
        <SummaryCard label={t('dash.commission')} value={fmt.rs(commission)} tone="amber" icon="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SalesByFishChart sales={sales} fromISO={daysAgoISO(6)} toISO={todayISO()} title={t('chart.salesByFish7')} />
        <CashFlowChart cashEntries={cashEntries} fromISO={daysAgoISO(13)} toISO={todayISO()} title={t('chart.cashFlow14')} />
      </div>

      {sales.length === 0 && cashEntries.length === 0 && (
        <EmptyState
          title={t('empty.salesTitle')}
          subtitle={t('empty.salesSub')}
          action={
            <Link to="/new-sale" className="rounded-lg bg-primary-700 px-5 py-3 text-sm font-bold text-white hover:bg-primary-800">
              {t('empty.firstSale')}
            </Link>
          }
        />
      )}

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-bold text-gray-900">{t('dash.topUdhaar')}</h2>
          <p className="text-xs text-gray-500">{t('dash.topUdhaarSub')}</p>
        </div>
        {topUdhaar.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">{t('dash.noUdhaar')}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {topUdhaar.map((p) => (
              <li key={p.id}>
                <Link to={`/khatas/${p.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-800">
                      {partyName(p).charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{partyName(p)}</p>
                      <TypeBadge type={p.type} />
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="latin text-sm font-bold text-red-600">{fmt.rs(p.balance)}</span>
                    <svg className="h-4 w-4 text-gray-300 rtl:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
