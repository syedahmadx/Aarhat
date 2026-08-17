import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatRs, formatDate } from '../utils/format';
import TypeBadge from '../components/TypeBadge';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';

export default function KhataDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { partyById, partyBalance, partyLedger } = useApp();

  const party = partyById(id);
  if (!party) {
    return (
      <EmptyState
        title="Party nahi mili"
        subtitle="Shayad yeh khata delete ho gaya hai."
        action={
          <Link to="/khatas" className="rounded-lg bg-primary-700 px-5 py-3 text-sm font-bold text-white hover:bg-primary-800">
            Wapis Khata List par
          </Link>
        }
      />
    );
  }

  const balance = partyBalance(id);
  const ledger = partyLedger(id);

  return (
    <div className="space-y-4">
      <button onClick={() => navigate('/khatas')} className="flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-900">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        Khata List
      </button>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-800">
              {party.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{party.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <TypeBadge type={party.type} />
                <span>{party.phone}</span>
                <span>·</span>
                <span>{party.area}</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 px-5 py-3 text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Final Balance</p>
            {balance === 0 ? (
              <p className="text-2xl font-extrabold text-gray-400">Clear</p>
            ) : balance > 0 ? (
              <p className="text-2xl font-extrabold text-green-700">Lena: {formatRs(balance)}</p>
            ) : (
              <p className="text-2xl font-extrabold text-red-600">Dena: {formatRs(balance)}</p>
            )}
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Link
            to={`/cash-entry?party=${party.id}`}
            className="rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-800"
          >
            + Add Cash Entry
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-base font-bold text-gray-900">Khata Entries</h2>
        </div>
        {ledger.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500">Is party ki abhi koi entry nahi hai.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Debit</th>
                  <th className="px-4 py-3 text-right">Credit</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="bg-gray-50/50 text-gray-500">
                  <td className="px-4 py-2.5 text-xs">—</td>
                  <td className="px-4 py-2.5 text-xs italic">Opening balance</td>
                  <td className="px-4 py-2.5" />
                  <td className="px-4 py-2.5" />
                  <td className={`px-4 py-2.5 text-right text-xs font-semibold ${party.openingBalance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {formatRs(party.openingBalance)} {party.openingBalance >= 0 ? 'Lena' : 'Dena'}
                  </td>
                </tr>
                {ledger.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDate(r.date)}</td>
                    <td className="px-4 py-3">
                      <span className="text-gray-800">{r.description}</span>
                      {r.status && <span className="ml-2"><StatusBadge status={r.status} /></span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900">{r.debit ? formatRs(r.debit) : ''}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-green-700">{r.credit ? formatRs(r.credit) : ''}</td>
                    <td className={`whitespace-nowrap px-4 py-3 text-right font-bold ${r.balance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {formatRs(r.balance)} {r.balance >= 0 ? 'Lena' : 'Dena'}
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
