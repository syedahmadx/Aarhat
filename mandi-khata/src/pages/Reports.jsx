import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLang } from '../i18n/LanguageContext';
import { todayISO, daysAgoISO } from '../utils/format';
import EmptyState from '../components/EmptyState';

export default function Reports() {
  const { sales, cashEntries } = useApp();
  const { t, fmt } = useLang();
  const [from, setFrom] = useState(daysAgoISO(6));
  const [to, setTo] = useState(todayISO());

  const invalidRange = from > to;

  const data = useMemo(() => {
    if (invalidRange) return null;
    const inRange = (d) => d >= from && d <= to;
    // Voided entries and their reversals are excluded as a pair, so a voided
    // sale neither inflates the count nor distorts a total.
    const live = (r) => !r.voidsId && !r.voidedBy;
    const rangeSales = sales.filter((s) => inRange(s.date) && live(s));
    const rangeCash = cashEntries.filter((c) => inRange(c.date) && live(c));

    const totalSales = rangeSales.reduce((s, x) => s + x.grossPaisa, 0);
    const commission = rangeSales.reduce((s, x) => s + x.commissionPaisa, 0);
    const cashIn = rangeCash.filter((c) => c.direction === 'wasooli').reduce((s, c) => s + c.amountPaisa, 0);
    const cashOut = rangeCash.filter((c) => c.direction === 'payment').reduce((s, c) => s + c.amountPaisa, 0);

    const expensesByType = {};
    let totalExpenses = 0;
    for (const s of rangeSales) {
      for (const e of s.expenses) {
        expensesByType[e.type] = (expensesByType[e.type] || 0) + e.amountPaisa;
        totalExpenses += e.amountPaisa;
      }
    }

    // Daily totals for the bar chart
    const byDay = new Map();
    const start = new Date(from);
    const end = new Date(to);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      byDay.set(iso, 0);
    }
    for (const s of rangeSales) byDay.set(s.date, (byDay.get(s.date) || 0) + s.grossPaisa);
    const days = [...byDay.entries()].map(([date, total]) => ({ date, total }));

    return { totalSales, commission, cashIn, cashOut, expensesByType, totalExpenses, days, saleCount: rangeSales.length };
  }, [sales, cashEntries, from, to, invalidRange]);

  const maxDay = data ? Math.max(...data.days.map((d) => d.total), 1) : 1;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('rep.title')}</h1>
        <p className="text-sm text-gray-500">{t('rep.ownerOnly')}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">{t('rep.from')}</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="latin rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">{t('rep.to')}</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="latin rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500" />
        </div>
        {invalidRange && <p className="pb-2 text-sm font-medium text-red-600">{t('rep.badRange')}</p>}
      </div>

      {!data ? null : data.saleCount === 0 && data.cashIn === 0 && data.cashOut === 0 ? (
        <EmptyState title={t('rep.emptyTitle')} subtitle={t('rep.emptySub')} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">{t('rep.totalSales', { n: data.saleCount })}</p>
              <p className="latin mt-1 text-lg font-bold text-gray-900">{fmt.rs(data.totalSales)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">{t('rep.commission')}</p>
              <p className="latin mt-1 text-lg font-bold text-amber-700">{fmt.rs(data.commission)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">{t('rep.cashIn')}</p>
              <p className="latin mt-1 text-lg font-bold text-green-700">{fmt.rs(data.cashIn)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">{t('rep.cashOut')}</p>
              <p className="latin mt-1 text-lg font-bold text-red-600">{fmt.rs(data.cashOut)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">{t('rep.dailySales')}</h2>
            <p className="latin text-xs text-gray-500">{fmt.date(from)} — {fmt.date(to)}</p>
            <div className="mt-5 flex items-end gap-2 overflow-x-auto pb-2" style={{ height: '180px' }}>
              {data.days.map((d) => (
                <div key={d.date} className="flex h-full min-w-10 flex-1 flex-col items-center justify-end gap-1">
                  <span className="latin text-[10px] font-semibold text-gray-600">{d.total > 0 ? fmt.num(d.total) : ''}</span>
                  <div
                    className={d.total > 0 ? 'w-full rounded-t-md bg-primary-600' : 'w-full rounded-t-md bg-gray-100'}
                    style={{ height: `${Math.max((d.total / maxDay) * 130, 3)}px` }}
                  />
                  <span className="whitespace-nowrap text-[10px] text-gray-400">{fmt.shortDate(d.date)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-bold text-gray-900">{t('rep.byType')}</h2>
            {Object.keys(data.expensesByType).length === 0 ? (
              <p className="text-sm text-gray-500">{t('rep.noExpenses')}</p>
            ) : (
              <ul className="space-y-2.5">
                {Object.entries(data.expensesByType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, amount]) => (
                    <li key={type} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-sm font-medium text-gray-700">{t(`exp.${type}`)}</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-primary-500" style={{ width: `${(amount / data.totalExpenses) * 100}%` }} />
                      </div>
                      <span className="latin w-24 shrink-0 text-end text-sm font-semibold text-gray-900">{fmt.rs(amount)}</span>
                    </li>
                  ))}
                <li className="flex items-center justify-between border-t border-gray-100 pt-2.5">
                  <span className="text-sm font-bold text-gray-900">{t('rep.totalExpenses')}</span>
                  <span className="latin text-sm font-bold text-red-600">{fmt.rs(data.totalExpenses)}</span>
                </li>
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
