import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLang } from '../i18n/LanguageContext';
import { todayISO } from '../utils/format';
import { parsePKR } from '../utils/money';
import SearchableSelect from '../components/SearchableSelect';
import ConfirmDialog from '../components/ConfirmDialog';

const inputCls = (err) =>
  `w-full rounded-lg border bg-white px-4 py-3 text-base text-gray-900 outline-none focus:border-primary-500 ${err ? 'border-red-400' : 'border-gray-300'}`;

export default function CashEntry() {
  const { parties, partyById, addCashEntry, showToast } = useApp();
  const { t, fmt, partyName } = useLang();
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

  const options = parties.filter((p) => !p.mergedInto).map((p) => ({ value: p.id, label: partyName(p), sublabel: t(`type.${p.type}`) }));
  const party = partyById(form.partyId);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  // Parsed once, at the boundary. Null while the field is empty or malformed;
  // past this line the amount is only ever an integer number of paisa.
  let amountPaisa = null;
  try {
    amountPaisa = parsePKR(form.amount);
  } catch {
    amountPaisa = null;
  }

  function validate() {
    const e = {};
    if (!form.partyId) e.partyId = t('err.party');
    const amt = amountPaisa;
    if (amt === null) e.amount = t('err.amountReq');
    else if (amt <= 0) e.amount = t('err.amountPos');
    if (!form.date) e.date = t('err.date');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function onSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    setConfirming(true);
  }

  const [saving, setSaving] = useState(false);

  async function onConfirm() {
    if (saving) return;
    const note = form.note.trim();
    setSaving(true);
    try {
      await addCashEntry({
        partyId: form.partyId,
        direction: form.direction,
        amountPaisa,
        date: form.date,
        note,
        noteUr: note, // user-typed notes are stored as-is in both languages
      });
      setConfirming(false);
      showToast(t(form.direction === 'wasooli' ? 'toast.wasooliSaved' : 'toast.paymentSaved', { amt: fmt.rs(amountPaisa) }));
      navigate(`/khatas/${form.partyId}`);
    } catch {
      setSaving(false);
      setConfirming(false);
      showToast(t('toast.saveFailed'), 'error');
    }
  }

  const isWasooli = form.direction === 'wasooli';
  const amt = amountPaisa || 0;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('cash.title')}</h1>
        <p className="text-sm text-gray-500">{t('cash.subtitle')}</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">{t('cash.party')}</label>
          <SearchableSelect options={options} value={form.partyId} onChange={(v) => set('partyId', v)} placeholder={t('cash.selectParty')} error={errors.partyId} />
          {errors.partyId && <p className="mt-1 text-xs font-medium text-red-600">{errors.partyId}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">{t('cash.kind')}</label>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => set('direction', 'wasooli')}
              className={isWasooli ? 'rounded-md bg-green-600 py-3 text-sm font-bold text-white' : 'rounded-md py-3 text-sm font-semibold text-gray-600 hover:bg-gray-200'}
            >
              {t('cash.wasooli')}
            </button>
            <button
              type="button"
              onClick={() => set('direction', 'payment')}
              className={!isWasooli ? 'rounded-md bg-orange-600 py-3 text-sm font-bold text-white' : 'rounded-md py-3 text-sm font-semibold text-gray-600 hover:bg-gray-200'}
            >
              {t('cash.payment')}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">{t('cash.amount')}</label>
          <input type="number" min="0" step="0.01" placeholder={t('cash.egAmount')} value={form.amount} onChange={(e) => set('amount', e.target.value)} className={inputCls(errors.amount) + ' latin'} />
          {errors.amount && <p className="mt-1 text-xs font-medium text-red-600">{errors.amount}</p>}
          {amt > 0 && <p className="latin mt-1 text-xs font-semibold text-primary-700">{fmt.rs(amt)}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">{t('cash.date')}</label>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputCls(errors.date) + ' latin'} />
          {errors.date && <p className="mt-1 text-xs font-medium text-red-600">{errors.date}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">{t('cash.note')}</label>
          <input type="text" placeholder={t('cash.egNote')} value={form.note} onChange={(e) => set('note', e.target.value)} className={inputCls(false)} />
        </div>

        <button type="submit" disabled={saving} className={`w-full rounded-lg px-4 py-3.5 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300 ${isWasooli ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
          {t(isWasooli ? 'cash.saveWasooli' : 'cash.savePayment')}
        </button>
      </form>

      <ConfirmDialog
        open={confirming}
        title={t(isWasooli ? 'cash.confirmWasooliTitle' : 'cash.confirmPaymentTitle')}
        message={party ? t(isWasooli ? 'cash.confirmWasooliMsg' : 'cash.confirmPaymentMsg', { amt: fmt.rs(amt), name: partyName(party) }) : ''}
        confirmLabel={t('common.confirm')}
        onConfirm={onConfirm}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
