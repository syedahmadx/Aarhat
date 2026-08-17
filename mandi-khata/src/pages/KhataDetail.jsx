import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLang } from '../i18n/LanguageContext';
import TypeBadge from '../components/TypeBadge';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';

export default function KhataDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { partyById, partyBalance, partyLedger } = useApp();
  const { t, fmt, partyName, partyArea, cashNote } = useLang();

  const party = partyById(id);
  if (!party) {
    return (
      <EmptyState
        title={t('kd.notFound')}
        subtitle={t('kd.notFoundSub')}
        action={
          <Link to="/khatas" className="rounded-lg bg-primary-700 px-5 py-3 text-sm font-bold text-white hover:bg-primary-800">
            {t('kd.backButton')}
          </Link>
        }
      />
    );
  }

  const balance = partyBalance(id);
  const ledger = partyLedger(id);

  // Ledger rows arrive as translation keys (sales) or a raw cash entry.
  function describe(r) {
    if (r.descKey) {
      return t(r.descKey, { ...r.descParams, fish: t(`fish.${r.descParams.fish}`) });
    }
    const base = t(r.cash.direction === 'wasooli' ? 'cash.noteWasooli' : 'cash.notePayment');
    const note = cashNote(r.cash);
    return note ? `${base} — ${note}` : base;
  }

  return (
    <div className="space-y-4">
      <button onClick={() => navigate('/khatas')} className="flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-900">
        <svg className="h-4 w-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        {t('kd.backToList')}
      </button>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-800">
              {partyName(party).charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{partyName(party)}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <TypeBadge type={party.type} />
                <span className="latin">{party.phone}</span>
                <span>·</span>
                <span>{partyArea(party)}</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 px-5 py-3 text-end">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('kd.finalBalance')}</p>
            {balance === 0 ? (
              <p className="text-2xl font-extrabold text-gray-400">{t('khata.clear')}</p>
            ) : balance > 0 ? (
              <p className="text-2xl font-extrabold text-green-700">
                {t('khata.lena')}: <span className="latin">{fmt.rs(balance)}</span>
              </p>
            ) : (
              <p className="text-2xl font-extrabold text-red-600">
                {t('khata.dena')}: <span className="latin">{fmt.rs(balance)}</span>
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Link
            to={`/cash-entry?party=${party.id}`}
            className="rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-800"
          >
            {t('kd.addCash')}
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-base font-bold text-gray-900">{t('kd.entries')}</h2>
        </div>
        {ledger.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500">{t('kd.noEntries')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-start text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-start">{t('kd.colDate')}</th>
                  <th className="px-4 py-3 text-start">{t('kd.colDesc')}</th>
                  <th className="px-4 py-3 text-end">{t('kd.colDebit')}</th>
                  <th className="px-4 py-3 text-end">{t('kd.colCredit')}</th>
                  <th className="px-4 py-3 text-end">{t('kd.colBalance')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="bg-gray-50/50 text-gray-500">
                  <td className="px-4 py-2.5 text-xs">—</td>
                  <td className="px-4 py-2.5 text-xs italic">{t('kd.opening')}</td>
                  <td className="px-4 py-2.5" />
                  <td className="px-4 py-2.5" />
                  <td className={`px-4 py-2.5 text-end text-xs font-semibold ${party.openingBalance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    <span className="latin">{fmt.rs(party.openingBalance)}</span> {party.openingBalance >= 0 ? t('khata.lena') : t('khata.dena')}
                  </td>
                </tr>
                {ledger.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="latin whitespace-nowrap px-4 py-3 text-gray-600">{fmt.date(r.date)}</td>
                    <td className="px-4 py-3">
                      <span className="text-gray-800">{describe(r)}</span>
                      {r.status && <span className="ms-2 inline-block"><StatusBadge status={r.status} /></span>}
                    </td>
                    <td className="latin whitespace-nowrap px-4 py-3 text-end font-semibold text-gray-900">{r.debit ? fmt.rs(r.debit) : ''}</td>
                    <td className="latin whitespace-nowrap px-4 py-3 text-end font-semibold text-green-700">{r.credit ? fmt.rs(r.credit) : ''}</td>
                    <td className={`whitespace-nowrap px-4 py-3 text-end font-bold ${r.balance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      <span className="latin">{fmt.rs(r.balance)}</span> {r.balance >= 0 ? t('khata.lena') : t('khata.dena')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
