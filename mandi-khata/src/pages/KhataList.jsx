import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLang } from '../i18n/LanguageContext';
import TypeBadge from '../components/TypeBadge';
import EmptyState from '../components/EmptyState';

const TYPE_FILTERS = [
  { key: 'all', label: 'khata.filterAll' },
  { key: 'beopari', label: 'khata.filterBeopari' },
  { key: 'khareedar', label: 'khata.filterKhareedar' },
];

const BALANCE_FILTERS = [
  { key: 'all', label: 'khata.filterAll' },
  { key: 'lena', label: 'khata.lena' },
  { key: 'dena', label: 'khata.dena' },
  { key: 'settled', label: 'khata.clear' },
];

// Filter/sort state lives in the URL query string so it survives refresh and
// the back button, and so a filtered view can be shared as a link. Defaults
// are omitted from the URL to keep it clean.
const DEFAULTS = { q: '', type: 'all', bal: 'all', sort: 'name', dir: 'asc' };

function matchesBalance(balance, bal) {
  if (bal === 'lena') return balance > 0;
  if (bal === 'dena') return balance < 0;
  if (bal === 'settled') return balance === 0;
  return true;
}

function Chip({ label, onClear }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 py-1 pe-1.5 ps-3 text-xs font-semibold text-primary-800">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`× ${label}`}
        className="flex h-4 w-4 items-center justify-center rounded-full text-primary-500 hover:bg-primary-200 hover:text-primary-900"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      </button>
    </span>
  );
}

export default function KhataList() {
  const { parties, partyBalance } = useApp();
  const { t, fmt, partyName, partyArea } = useLang();
  const [searchParams, setSearchParams] = useSearchParams();

  const state = {
    q: searchParams.get('q') ?? DEFAULTS.q,
    type: searchParams.get('type') ?? DEFAULTS.type,
    bal: searchParams.get('bal') ?? DEFAULTS.bal,
    sort: searchParams.get('sort') ?? DEFAULTS.sort,
    dir: searchParams.get('dir') ?? DEFAULTS.dir,
  };

  // Typing replaces history (no entry per keystroke); filter and sort clicks
  // push, so the back button steps through filter states.
  const update = (patch, { replace = false } = {}) => {
    const next = { ...state, ...patch };
    const params = {};
    for (const [k, v] of Object.entries(next)) {
      if (v !== DEFAULTS[k]) params[k] = v;
    }
    setSearchParams(params, { replace });
  };

  const toggleSort = (field) => {
    if (state.sort === field) {
      update({ dir: state.dir === 'asc' ? 'desc' : 'asc' });
    } else {
      // Balance defaults to desc — the biggest udhaar is what you look for.
      update({ sort: field, dir: field === 'balance' ? 'desc' : 'asc' });
    }
  };

  const activeParties = useMemo(() => parties.filter((p) => !p.mergedInto), [parties]);

  const list = useMemo(() => {
    const q = state.q.trim().toLowerCase();
    const rows = activeParties
      .filter((p) => state.type === 'all' || p.type === state.type)
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          (p.nameUr || '').includes(q) ||
          (p.area || '').toLowerCase().includes(q) ||
          (p.areaUr || '').includes(q) ||
          (p.phone || '').includes(q)
      )
      .map((p) => ({ ...p, balance: partyBalance(p.id) }))
      .filter((p) => matchesBalance(p.balance, state.bal));

    const sign = state.dir === 'asc' ? 1 : -1;
    rows.sort((a, b) =>
      state.sort === 'balance'
        ? sign * (a.balance - b.balance)
        : sign * a.name.localeCompare(b.name)
    );
    return rows;
  }, [activeParties, partyBalance, state.q, state.type, state.bal, state.sort, state.dir]);

  const filtersActive =
    state.q !== DEFAULTS.q || state.type !== DEFAULTS.type || state.bal !== DEFAULTS.bal;
  const sortActive = state.sort !== DEFAULTS.sort || state.dir !== DEFAULTS.dir;

  const chipCls = (active) =>
    active
      ? 'rounded-full bg-primary-700 px-4 py-2 text-sm font-semibold text-white'
      : 'rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:border-primary-400';

  const SortArrow = ({ dir }) => (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" aria-hidden="true">
      {dir === 'asc'
        ? <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75 12 8.25l7.5 7.5" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25 12 15.75 4.5 8.25" />}
    </svg>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('khata.title')}</h1>
        <p className="text-sm text-gray-500">{t('khata.subtitle')}</p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <svg className="pointer-events-none absolute start-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            value={state.q}
            onChange={(e) => update({ q: e.target.value }, { replace: true })}
            placeholder={t('khata.search')}
            className="w-full rounded-lg border border-gray-300 bg-white py-3 pe-4 ps-11 text-base outline-none focus:border-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('khata.filterAll')}>
            {TYPE_FILTERS.map((f) => (
              <button key={f.key} onClick={() => update({ type: f.key })} className={chipCls(state.type === f.key)}>
                {t(f.label)}
              </button>
            ))}
          </div>
          <span className="hidden h-5 w-px bg-gray-200 sm:block" aria-hidden="true" />
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('khata.balanceFilter')}>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('khata.balanceFilter')}</span>
            {BALANCE_FILTERS.map((f) => (
              <button key={f.key} onClick={() => update({ bal: f.key })} className={chipCls(state.bal === f.key)}>
                {t(f.label)}
              </button>
            ))}
          </div>
          <span className="hidden h-5 w-px bg-gray-200 sm:block" aria-hidden="true" />
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('khata.sortLabel')}>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('khata.sortLabel')}</span>
            {['name', 'balance'].map((field) => (
              <button
                key={field}
                onClick={() => toggleSort(field)}
                aria-pressed={state.sort === field}
                className={`${chipCls(state.sort === field)} inline-flex items-center gap-1`}
              >
                {t(field === 'name' ? 'khata.sortName' : 'khata.sortBalance')}
                {state.sort === field && <SortArrow dir={state.dir} />}
              </button>
            ))}
          </div>
        </div>

        {/* Active filters as removable chips, the count, and one reset. */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="latin text-sm font-medium text-gray-500">
            {t('khata.count', { shown: list.length, total: activeParties.length })}
          </span>
          {state.q && <Chip label={t('khata.chipSearch', { q: state.q })} onClear={() => update({ q: '' }, { replace: true })} />}
          {state.type !== 'all' && <Chip label={t(`khata.filter${state.type === 'beopari' ? 'Beopari' : 'Khareedar'}`)} onClear={() => update({ type: 'all' })} />}
          {state.bal !== 'all' && <Chip label={t(BALANCE_FILTERS.find((f) => f.key === state.bal).label)} onClear={() => update({ bal: 'all' })} />}
          {(filtersActive || sortActive) && (
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="text-sm font-semibold text-primary-700 hover:text-primary-900"
            >
              {t('khata.reset')}
            </button>
          )}
        </div>
      </div>

      {activeParties.length === 0 ? (
        <EmptyState
          title={t('empty.partiesTitle')}
          subtitle={t('empty.partiesSub')}
          action={
            <Link to="/new-sale" className="rounded-lg bg-primary-700 px-5 py-3 text-sm font-bold text-white hover:bg-primary-800">
              {t('empty.firstSale')}
            </Link>
          }
        />
      ) : list.length === 0 ? (
        <EmptyState
          title={t('khata.noMatchTitle')}
          subtitle={t('khata.noMatchSub')}
          action={
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="rounded-lg bg-primary-700 px-5 py-3 text-sm font-bold text-white hover:bg-primary-800"
            >
              {t('khata.reset')}
            </button>
          }
        />
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
