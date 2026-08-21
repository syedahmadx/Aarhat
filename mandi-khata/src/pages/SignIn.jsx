import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useLang } from '../i18n/LanguageContext';
import { authErrorKey } from '../lib/authErrors';
import AuthShell from '../components/AuthShell';
import FormField, { fieldInputCls } from '../components/FormField';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignIn() {
  const { signIn } = useAuth();
  const { showToast } = useApp();
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  // Where the user was headed before being bounced here, if anywhere.
  const redirectTo = location.state?.from?.pathname || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setFormError(null);
  };

  function validate() {
    const e = {};
    if (!form.email.trim()) e.email = t('auth.errEmailReq');
    else if (!EMAIL_RE.test(form.email.trim())) e.email = t('auth.errEmailFormat');
    if (!form.password) e.password = t('auth.errPasswordReq');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    const { error } = await signIn(form.email, form.password);
    setSubmitting(false);

    if (error) {
      // Wrong credentials is a whole-form problem: we deliberately do not say
      // which of the two was wrong, since that would confirm an email exists.
      setFormError(t(authErrorKey(error)));
      return;
    }

    showToast(t('auth.signInSuccess'));
    navigate(redirectTo, { replace: true });
  }

  return (
    <AuthShell>
      <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('auth.signInTitle')}</h1>
          <p className="mt-1.5 text-sm text-gray-500">{t('auth.signInSub')}</p>

          {formError && (
            <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {formError}
            </div>
          )}

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            <FormField id="email" label={t('auth.email')} error={errors.email}>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={t('auth.egEmail')}
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className={fieldInputCls(errors.email) + ' latin'}
              />
            </FormField>

            <FormField id="password" label={t('auth.password')} error={errors.password}>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className={fieldInputCls(errors.password) + ' latin'}
              />
            </FormField>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-primary-700 px-4 py-3.5 text-base font-bold text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {submitting ? t('auth.signingIn') : t('auth.signInSubmit')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            {t('auth.noAccount')}{' '}
            <Link to="/signup" className="font-bold text-primary-700 hover:text-primary-900">
              {t('auth.signUp')}
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
