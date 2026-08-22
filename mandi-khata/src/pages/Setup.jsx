import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useLang } from '../i18n/LanguageContext';
import { createShopForUser, SHOP_ERR } from '../lib/shop';
import AuthShell from '../components/AuthShell';
import FormField, { fieldInputCls } from '../components/FormField';

// One-time onboarding. Until this runs, every RLS-gated read in the ledger
// returns nothing (profiles.shop_id is NULL), so ProtectedRoute funnels every
// shopless user here and SetupRoute keeps onboarded users out.
export default function Setup() {
  const { refreshProfile, signOut, user } = useAuth();
  const { showToast } = useApp();
  const { t } = useLang();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [nameUr, setNameUr] = useState('');
  const [nameError, setNameError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(ev) {
    ev.preventDefault();
    setFormError(null);
    setNameError(null);

    if (!name.trim()) {
      setNameError(t('setup.errNameReq'));
      return;
    }

    setSubmitting(true);
    const { code, error } = await createShopForUser(name.trim(), nameUr);

    if (error) {
      switch (code) {
        case SHOP_ERR.ALREADY_HAS_SHOP: {
          // The database has a shop this client does not know about (stale
          // cache, second tab). Refresh, then let the dashboard load — the
          // fresh profile carries the shop_id RLS needs.
          await refreshProfile();
          setSubmitting(false);
          showToast(t('setup.errHasShop'), 'error');
          navigate('/dashboard', { replace: true });
          return;
        }
        case SHOP_ERR.BLANK_NAME:
          setSubmitting(false);
          setNameError(t('setup.errNameReq'));
          return;
        case SHOP_ERR.NOT_SIGNED_IN: {
          // The server saw no auth.uid(): the session is dead even if this
          // client still holds one. Clear it so the guards agree.
          setSubmitting(false);
          await signOut();
          showToast(t('setup.errSession'), 'error');
          navigate('/signin', { replace: true });
          return;
        }
        default:
          setSubmitting(false);
          setFormError(t('auth.errGeneric'));
          return;
      }
    }

    // Refresh BEFORE navigating: the cached profile still has shop_id null,
    // and the dashboard's RLS-gated reads would return nothing against it.
    // (This also lets ProtectedRoute's shop gate pass instead of bouncing
    // straight back here.)
    await refreshProfile();
    setSubmitting(false);
    showToast(t('setup.success'));
    navigate('/dashboard', { replace: true });
  }

  return (
    <AuthShell>
      <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('setup.title')}</h1>
          <p className="mt-1.5 text-sm text-gray-500">{t('setup.subtitle')}</p>

          {formError && (
            <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {formError}
            </div>
          )}

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            <FormField id="shopName" label={t('setup.shopName')} error={nameError}>
              <input
                id="shopName"
                type="text"
                autoComplete="organization"
                placeholder={t('setup.egName')}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                  setFormError(null);
                }}
                aria-invalid={!!nameError}
                aria-describedby={nameError ? 'shopName-error' : undefined}
                className={fieldInputCls(nameError)}
              />
            </FormField>

            <FormField id="shopNameUr" label={t('setup.shopNameUr')} hint={t('setup.optional')}>
              <input
                id="shopNameUr"
                type="text"
                dir="rtl"
                placeholder={t('setup.egNameUr')}
                value={nameUr}
                onChange={(e) => setNameUr(e.target.value)}
                style={{ fontFamily: 'var(--font-urdu)' }}
                className={fieldInputCls(false)}
              />
            </FormField>

            <p className="rounded-lg bg-primary-50 px-4 py-3 text-xs leading-relaxed text-primary-800">
              {t('setup.note')}
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-primary-700 px-4 py-3.5 text-base font-bold text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {submitting ? t('setup.creating') : t('setup.submit')}
            </button>
          </form>

          {/* Escape hatch: this page traps shopless users, so the only other
              thing they can sensibly do from here is leave. */}
          <p className="mt-6 text-center text-sm text-gray-500">
            {t('setup.wrongAccount')}{' '}
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate('/', { replace: true });
              }}
              className="font-bold text-primary-700 hover:text-primary-900"
            >
              {t('auth.signOut')}
            </button>
            {user?.email && <span className="latin mt-1 block text-xs text-gray-400">{user.email}</span>}
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
