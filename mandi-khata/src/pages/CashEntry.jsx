import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatRs, todayISO } from '../utils/format';
import SearchableSelect from '../components/SearchableSelect';
import ConfirmDialog from '../components/ConfirmDialog';

const inputCls = (err) =>
  `w-full rounded-lg border bg-white px-4 py-3 text-base text-gray-900 outline-none focus:border-primary-500 ${err ? 'border-red-400' : 'border-gray-300'}`;

export default function CashEntry() {
  const { parties, partyById, addCashEntry, showToast } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    partyId: searchParams.get('party') || '',
    direction: 'wasooli',
    amount: '',
    date: todayISO(),
    note: '',
  });
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);

  const options = parties.map((p) => ({ value: p.id, label: p.name, sublabel: p.type === 'beopari' ? 'Beopari' : 'Khareedar' }));
  const party = partyById(form.partyId);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  function validate() {
    const e = {};
    if (!form.partyId) e.partyId = 'Party select karein';
    const amt = parseFloat(form.amount);
    if (form.amount === '' || Number.isNaN(amt)) e.amount = 'Amount zaroori hai';
    else if (amt <= 0) e.amount = 'Amount 0 se zyada hona chahiye';
    if (!form.date) e.date = 'Date zaroori hai';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function onSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    setConfirming(true);
  }

  function onConfirm() {
    addCashEntry({
      partyId: form.partyId,
      direction: form.direction,
      amount: parseFloat(form.amount),
      date: form.date,
      note: form.note.trim(),
    });
    setConfirming(false);
    showToast(
      form.direction === 'wasooli'
        ? `${formatRs(parseFloat(form.amount))} wasooli save ho gayi`
        : `${formatRs(parseFloat(form.amount))} payment save ho gayi`
    );
    navigate(`/khatas/${form.partyId}`);
  }

  const isWasooli = form.direction === 'wasooli';
  const amt = parseFloat(form.amount) || 0;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Cash Entry</h1>
        <p className="text-sm text-gray-500">Wasooli ya payment darj karein</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Party</label>
          <SearchableSelect options={options} value={form.partyId} onChange={(v) => set('partyId', v)} placeholder="Party select karein" error={errors.partyId} />
          {errors.partyId && <p className="mt-1 text-xs font-medium text-red-600">{errors.partyId}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Qisam</label>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => set('direction', 'wasooli')}
              className={isWasooli ? 'rounded-md bg-green-600 py-3 text-sm font-bold text-white' : 'rounded-md py-3 text-sm font-semibold text-gray-600 hover:bg-gray-200'}
            >
              Wasooli (Received)
            </button>
            <button
              type="button"
              onClick={() => set('direction', 'payment')}
              className={!isWasooli ? 'rounded-md bg-orange-600 py-3 text-sm font-bold text-white' : 'rounded-md py-3 text-sm font-semibold text-gray-600 hover:bg-gray-200'}
            >
              Payment (Paid Out)
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Amount (Rs.)</label>
          <input type="number" min="0" placeholder="e.g. 50000" value={form.amount} onChange={(e) => set('amount', e.target.value)} className={inputCls(errors.amount)} />
          {errors.amount && <p className="mt-1 text-xs font-medium text-red-600">{errors.amount}</p>}
          {amt > 0 && <p className="mt-1 text-xs font-semibold text-primary-700">{formatRs(amt)}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Date</label>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputCls(errors.date)} />
          {errors.date && <p className="mt-1 text-xs font-medium text-red-600">{errors.date}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Note (optional)</label>
          <input type="text" placeholder="e.g. Rohu sale wasooli" value={form.note} onChange={(e) => set('note', e.target.value)} className={inputCls(false)} />
        </div>

        <button type="submit" className={`w-full rounded-lg px-4 py-3.5 text-base font-bold text-white ${isWasooli ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
          {isWasooli ? 'Wasooli Save Karein' : 'Payment Save Karein'}
        </button>
      </form>

      <ConfirmDialog
        open={confirming}
        title={isWasooli ? 'Wasooli confirm karein' : 'Payment confirm karein'}
        message={
          party
            ? isWasooli
              ? `${formatRs(amt)} wasooli from ${party.name} — confirm?`
              : `${formatRs(amt)} payment to ${party.name} — confirm?`
            : ''
        }
        confirmLabel="Confirm"
        onConfirm={onConfirm}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
