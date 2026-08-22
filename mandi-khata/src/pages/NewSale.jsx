import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLang } from '../i18n/LanguageContext';
import { EXPENSE_TYPES } from '../data/mockData';
import { todayISO } from '../utils/format';
import {
  grossPaisa,
  commissionPaisa,
  netPayoutPaisa,
  parseWeightKg,
  parseRate,
  parsePercentBp,
  parsePKR,
} from '../utils/money';
import SearchableSelect from '../components/SearchableSelect';
import FormField, { fieldInputCls } from '../components/FormField';
import Breadcrumbs from '../components/Breadcrumbs';

const inputCls = fieldInputCls;

// The form holds raw strings, because that is what a person types. Every one
// is converted to an integer by a money.js parser and never touched again.
// Returns null rather than throwing so the live panel can stay quiet while a
// field is half-typed; validate() is what turns a null into a message.
function tryParse(parser, raw) {
  try {
    return parser(raw);
  } catch {
    return null;
  }
}

const EMPTY_CALC = { gross: 0, commission: 0, expensesTotal: 0, net: 0 };

function Field({ label, error, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-gray-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

// A brand-new shop has no parties at all, so the first sale is impossible
// without creating them right here. Minimal on purpose: name, optional Urdu
// name, optional phone. The type is fixed by which picker opened the dialog.
function NewPartyDialog({ type, onClose, onCreated }) {
  const { addParty, showToast } = useApp();
  const { t } = useLang();
  const [name, setName] = useState('');
  const [nameUr, setNameUr] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function onSave(ev) {
    ev.preventDefault();
    if (!name.trim()) {
      setError(t('party.errName'));
      return;
    }
    setSaving(true);
    try {
      const p = await addParty({
        name: name.trim(),
        nameUr: nameUr.trim() || null,
        phone: phone.trim() || null,
        type,
      });
      showToast(t('toast.partySaved'));
      onCreated(p);
    } catch {
      setSaving(false);
      setError(t('toast.saveFailed'));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={saving ? undefined : onClose} />
      <form onSubmit={onSave} className="relative w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-xl">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{t('party.newTitle')}</h3>
          <p className="mt-0.5 text-sm text-gray-500">{t(`type.${type}`)}</p>
        </div>
        <FormField id="np-name" label={t('party.name')} error={error}>
          <input
            id="np-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            className={fieldInputCls(error)}
            autoFocus
          />
        </FormField>
        <FormField id="np-name-ur" label={t('party.nameUr')}>
          <input
            id="np-name-ur"
            type="text"
            dir="rtl"
            value={nameUr}
            onChange={(e) => setNameUr(e.target.value)}
            style={{ fontFamily: 'var(--font-urdu)' }}
            className={fieldInputCls(false)}
          />
        </FormField>
        <FormField id="np-phone" label={t('party.phone')}>
          <input
            id="np-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={fieldInputCls(false) + ' latin'}
          />
        </FormField>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {saving ? t('prof.saving') : t('party.save')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewSale() {
  const { parties, fishTypes, addSale, showToast } = useApp();
  const { t, fmt, partyName, partyArea, fishName } = useLang();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    date: todayISO(),
    gaari: '',
    beopariId: '',
    khareedarId: '',
    fishTypeId: '',
    weight: '',
    rate: '',
    commissionPct: '6.25',
  });
  const [expenses, setExpenses] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [addingParty, setAddingParty] = useState(null); // null | 'beopari' | 'khareedar'

  const beoparis = parties
    .filter((p) => p.type === 'beopari' && !p.mergedInto)
    .map((p) => ({ value: p.id, label: partyName(p), sublabel: partyArea(p) }));
  const khareedars = parties
    .filter((p) => p.type === 'khareedar' && !p.mergedInto)
    .map((p) => ({ value: p.id, label: partyName(p), sublabel: partyArea(p) }));

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  // Live panel. Runs the exact calls addSale will run, on the exact integers
  // it will store, so what the munshi reads here is what lands in the khata.
  const calc = useMemo(() => {
    const weightG = tryParse(parseWeightKg, form.weight);
    const ratePaisaPerKg = tryParse(parseRate, form.rate);
    const commissionBp = tryParse(parsePercentBp, form.commissionPct);
    if (weightG === null || ratePaisaPerKg === null || commissionBp === null) return EMPTY_CALC;
    if (weightG <= 0 || ratePaisaPerKg <= 0) return EMPTY_CALC;

    const gross = grossPaisa(weightG, ratePaisaPerKg);
    const commission = commissionPaisa(gross, commissionBp);
    const expensesTotal = expenses.reduce((sum, e) => {
      const amount = tryParse(parsePKR, e.amount);
      return sum + (amount !== null && amount > 0 ? amount : 0);
    }, 0);
    return { gross, commission, expensesTotal, net: netPayoutPaisa(gross, commission, expensesTotal) };
  }, [form.weight, form.rate, form.commissionPct, expenses]);

  const addExpenseRow = () => setExpenses((x) => [...x, { type: 'Baraf', amount: '' }]);
  const setExpense = (i, k, v) => setExpenses((x) => x.map((e, j) => (j === i ? { ...e, [k]: v } : e)));
  const removeExpense = (i) => setExpenses((x) => x.filter((_, j) => j !== i));

  function validate() {
    const e = {};
    if (!form.date) e.date = t('err.date');
    if (!form.gaari.trim()) e.gaari = t('err.gaari');
    if (!form.beopariId) e.beopariId = t('err.beopari');
    if (!form.khareedarId) e.khareedarId = t('err.khareedar');
    if (!form.fishTypeId) e.fishTypeId = t('err.fishType');

    const weightG = tryParse(parseWeightKg, form.weight);
    if (weightG === null) e.weight = t('err.weightReq');
    else if (weightG <= 0) e.weight = t('err.weightPos');

    const ratePaisaPerKg = tryParse(parseRate, form.rate);
    if (ratePaisaPerKg === null) e.rate = t('err.rateReq');
    else if (ratePaisaPerKg <= 0) e.rate = t('err.ratePos');

    const commissionBp = tryParse(parsePercentBp, form.commissionPct);
    if (commissionBp === null) e.commissionPct = t('err.commissionReq');

    expenses.forEach((x, i) => {
      const amount = tryParse(parsePKR, x.amount);
      if (amount === null) e[`exp${i}`] = t('err.amountReq');
      else if (amount < 0) e[`exp${i}`] = t('err.amountNeg');
    });

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSave(ev) {
    ev.preventDefault();
    if (saving) return;
    if (!validate()) {
      showToast(t('toast.formErrors'), 'error');
      return;
    }
    setSaving(true);
    try {
      await addSale({
        date: form.date,
        gaari: form.gaari.trim().toUpperCase(),
        beopariId: form.beopariId,
        khareedarId: form.khareedarId,
        fishTypeId: form.fishTypeId,
        weightG: parseWeightKg(form.weight),
        ratePaisaPerKg: parseRate(form.rate),
        commissionBp: parsePercentBp(form.commissionPct),
        expenses: expenses.map((x) => ({ type: x.type, amountPaisa: parsePKR(x.amount) })),
      });
      showToast(t('toast.saleSaved'));
      navigate('/roznamcha');
    } catch {
      setSaving(false);
      showToast(t('toast.saveFailed'), 'error');
    }
  }

  return (
    <>
    <div className="mb-4">
      <Breadcrumbs items={[{ label: t('nav.roznamcha'), to: '/roznamcha' }]} current={t('nav.newSale')} />
    </div>
    {/* The dialog lives OUTSIDE this form: a form nested in a form does not
        submit, so the dialog's own submit button would be dead inside it. */}
    <form onSubmit={onSave} noValidate className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-gray-900">{t('sale.details')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('sale.date')} error={errors.date}>
              <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputCls(errors.date) + ' latin'} />
            </Field>
            <Field label={t('sale.gaari')} error={errors.gaari}>
              <input type="text" placeholder={t('sale.egGaari')} value={form.gaari} onChange={(e) => set('gaari', e.target.value)} className={inputCls(errors.gaari) + ' latin'} />
            </Field>
            <Field label={t('sale.beopari')} error={errors.beopariId}>
              <SearchableSelect options={beoparis} value={form.beopariId} onChange={(v) => set('beopariId', v)} placeholder={t('sale.selectBeopari')} error={errors.beopariId} />
              <button type="button" onClick={() => setAddingParty('beopari')} className="mt-1.5 text-xs font-semibold text-primary-700 hover:text-primary-900">
                {t('sale.addNewParty')}
              </button>
            </Field>
            <Field label={t('sale.khareedar')} error={errors.khareedarId}>
              <SearchableSelect options={khareedars} value={form.khareedarId} onChange={(v) => set('khareedarId', v)} placeholder={t('sale.selectKhareedar')} error={errors.khareedarId} />
              <button type="button" onClick={() => setAddingParty('khareedar')} className="mt-1.5 text-xs font-semibold text-primary-700 hover:text-primary-900">
                {t('sale.addNewParty')}
              </button>
            </Field>
            <Field label={t('sale.fishType')} error={errors.fishTypeId}>
              <select value={form.fishTypeId} onChange={(e) => set('fishTypeId', e.target.value)} className={inputCls(errors.fishTypeId)}>
                <option value="">{t('sale.selectPlaceholder')}</option>
                {fishTypes.map((f) => <option key={f.id} value={f.id}>{fishName(f)}</option>)}
              </select>
            </Field>
            <Field label={t('sale.weight')} error={errors.weight}>
              <input type="number" min="0" step="0.001" placeholder={t('sale.egWeight')} value={form.weight} onChange={(e) => set('weight', e.target.value)} className={inputCls(errors.weight) + ' latin'} />
            </Field>
            <Field label={t('sale.rate')} error={errors.rate}>
              <input type="number" min="0" step="0.01" placeholder={t('sale.egRate')} value={form.rate} onChange={(e) => set('rate', e.target.value)} className={inputCls(errors.rate) + ' latin'} />
            </Field>
            <Field label={t('sale.commissionPct')} error={errors.commissionPct}>
              <input type="number" min="0" step="0.25" value={form.commissionPct} onChange={(e) => set('commissionPct', e.target.value)} className={inputCls(errors.commissionPct) + ' latin'} />
            </Field>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-gray-900">{t('sale.expenses')}</h2>
            <button type="button" onClick={addExpenseRow} className="rounded-lg bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100">
              {t('sale.addExpense')}
            </button>
          </div>
          {expenses.length === 0 && <p className="text-sm text-gray-400">{t('sale.noExpenses')}</p>}
          <div className="space-y-3">
            {expenses.map((x, i) => (
              <div key={i}>
                <div className="flex items-center gap-2">
                  <select value={x.type} onChange={(e) => setExpense(i, 'type', e.target.value)} className="w-40 shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-3 text-base outline-none focus:border-primary-500">
                    {EXPENSE_TYPES.map((ty) => <option key={ty} value={ty}>{t(`exp.${ty}`)}</option>)}
                  </select>
                  <input
                    type="number" min="0" placeholder={t('sale.amount')}
                    value={x.amount}
                    onChange={(e) => { setExpense(i, 'amount', e.target.value); setErrors((er) => ({ ...er, [`exp${i}`]: undefined })); }}
                    className={inputCls(errors[`exp${i}`]) + ' latin flex-1'}
                  />
                  <button type="button" onClick={() => removeExpense(i)} aria-label={t('sale.removeExpense')} className="shrink-0 rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
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
          <h2 className="mb-4 text-base font-bold text-gray-900">{t('sale.calcTitle')}</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500">{t('sale.gross')}</dt>
              <dd className="latin font-semibold text-gray-900">{fmt.rs(calc.gross)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500">{t('sale.commissionAt', { pct: form.commissionPct || 0 })}</dt>
              <dd className="latin font-semibold text-amber-700">- {fmt.rs(calc.commission)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500">{t('sale.totalExpenses')}</dt>
              <dd className="latin font-semibold text-red-600">- {fmt.rs(calc.expensesTotal)}</dd>
            </div>
          </dl>
          <div className="mt-4 rounded-lg bg-primary-900 px-4 py-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-primary-300">{t('sale.netPayout')}</p>
            <p className="latin mt-1 text-3xl font-extrabold text-white">{fmt.rs(calc.net)}</p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 w-full rounded-lg bg-primary-700 px-4 py-3.5 text-base font-bold text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {saving ? t('sale.saving') : t('sale.save')}
          </button>
          <p className="mt-2 text-center text-xs text-gray-400">{t('sale.pendingNote')}</p>
        </div>
      </div>

    </form>
    {addingParty && (
      <NewPartyDialog
        type={addingParty}
        onClose={() => setAddingParty(null)}
        onCreated={(p) => {
          set(addingParty === 'beopari' ? 'beopariId' : 'khareedarId', p.id);
          setAddingParty(null);
        }}
      />
    )}
    </>
  );
}
