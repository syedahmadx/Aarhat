import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLang } from '../i18n/LanguageContext';
import TypeBadge from '../components/TypeBadge';
import EmptyState from '../components/EmptyState';

const FILTERS = [
  { key: 'all', label: 'khata.filterAll' },
  { key: 'beopari', label: 'khata.filterBeopari' },
  { key: 'khareedar', label: 'khata.filterKhareedar' },
];

export default function KhataList() {
  const { parties, partyBalance } = useApp();
  const { t, fmt, partyName, partyArea } = useLang();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parties
      .filter((p) => !p.mergedInto)
      .filter((p) => filter === 'all' || p.type === filter)
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          (p.nameUr || '').includes(q) ||
          p.area.toLowerCase().includes(q) ||
          (p.areaUr || '').includes(q) ||
          p.phone.includes(q)
      )
      .map((p) => ({ ...p, balance: partyBalance(p.id) }))
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  }, [parties, partyBalance, query, filter]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('khata.title')}</h1>
        <p className="text-sm text-gray-500">{t('khata.subtitle')}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute start-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('khata.search')}
            className="w-full rounded-lg border border-gray-300 bg-white py-3 pe-4 ps-11 text-base outline-none focus:border-primary-500"
          />
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={
                filter === f.key
                  ? 'rounded-full bg-primary-700 px-4 py-2 text-sm font-semibold text-white'
                  : 'rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:border-primary-400'
              }
            >
              {t(f.label)}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState title={t('khata.emptyTitle')} subtitle={t('khata.emptySub')} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((p) => (
            <Link
              key={p.id}
              to={`/khatas/${p.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-primary-300 hover:shadow"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-100 text-base font-bold text-primary-800">
                  {partyName(p).charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900">{partyName(p)}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <TypeBadge type={p.type} />
                    <span className="latin truncate text-xs text-gray-500">{p.phone}</span>
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-end">
                {p.balance === 0 ? (
                  <p className="text-sm font-bold text-gray-400">{t('khata.clear')}</p>
                ) : p.balance > 0 ? (
                  <p className="text-sm font-bold text-green-700">
                    {t('khata.lena')}: <span className="latin">{fmt.rs(p.balance)}</span>
                  </p>
                ) : (
                  <p className="text-sm font-bold text-red-600">
                    {t('khata.dena')}: <span className="latin">{fmt.rs(p.balance)}</span>
                  </p>
                )}
                <p className="text-xs text-gray-400">{partyArea(p)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
