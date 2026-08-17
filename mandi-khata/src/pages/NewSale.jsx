import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { FISH_TYPES, EXPENSE_TYPES } from '../data/mockData';
import { formatRs, todayISO } from '../utils/format';
import SearchableSelect from '../components/SearchableSelect';

const inputCls = (err) =>
  `w-full rounded-lg border bg-white px-4 py-3 text-base text-gray-900 outline-none focus:border-primary-500 ${err ? 'border-red-400' : 'border-gray-300'}`;

function Field({ label, error, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-gray-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export default function NewSale() {
  const { parties, addSale, showToast } = useApp();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    date: todayISO(),
    gaari: '',
    beopariId: '',
    khareedarId: '',
    fishType: '',
    weight: '',
    rate: '',
    commissionPct: '6.25',
  });
  const [expenses, setExpenses] = useState([]);
  const [errors, setErrors] = useState({});

  const beoparis = parties.filter((p) => p.type === 'beopari').map((p) => ({ value: p.id, label: p.name, sublabel: p.area }));
  const khareedars = parties.filter((p) => p.type === 'khareedar').map((p) => ({ value: p.id, label: p.name, sublabel: p.area }));

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  // Live calculation
  const calc = useMemo(() => {
    const weight = parseFloat(form.weight) || 0;
    const rate = parseFloat(form.rate) || 0;
    const pct = parseFloat(form.commissionPct) || 0;
    const gross = weight * rate;
    const commission = Math.round((gross * pct) / 100);
    const totalExpenses = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    return { gross, commission, totalExpenses, net: gross - commission - totalExpenses };
  }, [form.weight, form.rate, form.commissionPct, expenses]);

  const addExpenseRow = () => setExpenses((x) => [...x, { type: 'Baraf', amount: '' }]);
  const setExpense = (i, k, v) => setExpenses((x) => x.map((e, j) => (j === i ? { ...e, [k]: v } : e)));
  const removeExpense = (i) => setExpenses((x) => x.filter((_, j) => j !== i));

  function validate() {
    const e = {};
    if (!form.date) e.date = 'Date zaroori hai';
    if (!form.gaari.trim()) e.gaari = 'Gaari number zaroori hai';
    if (!form.beopariId) e.beopariId = 'Beopari select karein';
    if (!form.khareedarId) e.khareedarId = 'Khareedar select karein';
    if (!form.fishType) e.fishType = 'Fish type select karein';
    const weight = parseFloat(form.weight);
    if (form.weight === '' || Number.isNaN(weight)) e.weight = 'Weight zaroori hai';
    else if (weight <= 0) e.weight = 'Weight 0 se zyada hona chahiye';
    const rate = parseFloat(form.rate);
    if (form.rate === '' || Number.isNaN(rate)) e.rate = 'Rate zaroori hai';
    else if (rate <= 0) e.rate = 'Rate 0 se zyada hona chahiye';
    const pct = parseFloat(form.commissionPct);
    if (form.commissionPct === '' || Number.isNaN(pct)) e.commissionPct = 'Commission % zaroori hai';
    else if (pct < 0) e.commissionPct = 'Commission negative nahi ho sakta';
    expenses.forEach((x, i) => {
      const amt = parseFloat(x.amount);
      if (x.amount === '' || Number.isNaN(amt)) e[`exp${i}`] = 'Amount likhein';
      else if (amt < 0) e[`exp${i}`] = 'Negative amount allowed nahi';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function onSave(ev) {
    ev.preventDefault();
    if (!validate()) {
      showToast('Form mein ghaltiyan hain — check karein', 'error');
      return;
    }
    addSale({
      date: form.date,
      gaari: form.gaari.trim().toUpperCase(),
      beopariId: form.beopariId,
      khareedarId: form.khareedarId,
      fishType: form.fishType,
      weight: parseFloat(form.weight),
      rate: parseFloat(form.rate),
      commissionPct: parseFloat(form.commissionPct),
      expenses: expenses.map((x) => ({ type: x.type, amount: parseFloat(x.amount) })),
    });
    showToast('Sale save ho gayi — Roznamcha mein shamil');
    navigate('/roznamcha');
  }

  return (
    <form onSubmit={onSave} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-gray-900">Sale ki Tafseel</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" error={errors.date}>
              <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputCls(errors.date)} />
            </Field>
            <Field label="Gaari Number" error={errors.gaari}>
              <input type="text" placeholder="e.g. LEB-4521" value={form.gaari} onChange={(e) => set('gaari', e.target.value)} className={inputCls(errors.gaari)} />
            </Field>
            <Field label="Beopari (Supplier)" error={errors.beopariId}>
              <SearchableSelect options={beoparis} value={form.beopariId} onChange={(v) => set('beopariId', v)} placeholder="Beopari select karein" error={errors.beopariId} />
            </Field>
            <Field label="Khareedar (Buyer)" error={errors.khareedarId}>
              <SearchableSelect options={khareedars} value={form.khareedarId} onChange={(v) => set('khareedarId', v)} placeholder="Khareedar select karein" error={errors.khareedarId} />
            </Field>
            <Field label="Fish Type" error={errors.fishType}>
              <select value={form.fishType} onChange={(e) => set('fishType', e.target.value)} className={inputCls(errors.fishType)}>
                <option value="">Select karein</option>
                {FISH_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Weight (kg)" error={errors.weight}>
              <input type="number" min="0" step="0.5" placeholder="e.g. 150" value={form.weight} onChange={(e) => set('weight', e.target.value)} className={inputCls(errors.weight)} />
            </Field>
            <Field label="Rate (Rs. per kg)" error={errors.rate}>
              <input type="number" min="0" step="1" placeholder="e.g. 450" value={form.rate} onChange={(e) => set('rate', e.target.value)} className={inputCls(errors.rate)} />
            </Field>
            <Field label="Commission %" error={errors.commissionPct}>
              <input type="number" min="0" step="0.25" value={form.commissionPct} onChange={(e) => set('commissionPct', e.target.value)} className={inputCls(errors.commissionPct)} />
            </Field>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Kharcha (Expenses)</h2>
            <button type="button" onClick={addExpenseRow} className="rounded-lg bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100">
              + Kharcha Add Karein
            </button>
          </div>
          {expenses.length === 0 && <p className="text-sm text-gray-400">Koi kharcha add nahi hua.</p>}
          <div className="space-y-3">
            {expenses.map((x, i) => (
              <div key={i}>
                <div className="flex items-center gap-2">
                  <select value={x.type} onChange={(e) => setExpense(i, 'type', e.target.value)} className="w-40 rounded-lg border border-gray-300 bg-white px-3 py-3 text-base outline-none focus:border-primary-500">
                    {EXPENSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input
                    type="number" min="0" placeholder="Amount (Rs.)"
                    value={x.amount}
                    onChange={(e) => { setExpense(i, 'amount', e.target.value); setErrors((er) => ({ ...er, [`exp${i}`]: undefined })); }}
                    className={inputCls(errors[`exp${i}`]) + ' flex-1'}
                  />
                  <button type="button" onClick={() => removeExpense(i)} aria-label="Remove expense" className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                {errors[`exp${i}`] && <p className="mt-1 text-xs font-medium text-red-600">{errors[`exp${i}`]}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="sticky top-20 rounded-xl border border-primary-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-gray-900">Hisaab</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Gross Amount</dt>
              <dd className="font-semibold text-gray-900">{formatRs(calc.gross)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Commission ({form.commissionPct || 0}%)</dt>
              <dd className="font-semibold text-amber-700">- {formatRs(calc.commission)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Total Kharcha</dt>
              <dd className="font-semibold text-red-600">- {formatRs(calc.totalExpenses)}</dd>
            </div>
          </dl>
          <div className="mt-4 rounded-lg bg-primary-900 px-4 py-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-primary-300">Net Payout (Beopari ko)</p>
            <p className="mt-1 text-3xl font-extrabold text-white">{formatRs(calc.net)}</p>
          </div>
          <button type="submit" className="mt-4 w-full rounded-lg bg-primary-700 px-4 py-3.5 text-base font-bold text-white hover:bg-primary-800">
            Sale Save Karein
          </button>
          <p className="mt-2 text-center text-xs text-gray-400">Save hone par status "Pending" hoga</p>
        </div>
      </div>
    </form>
  );
}
