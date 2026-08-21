import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useLang } from '../i18n/LanguageContext';
import { authErrorKey } from '../lib/authErrors';
import AuthShell from '../components/AuthShell';
import FormField, { fieldInputCls } from '../components/FormField';

// Deliberately permissive: the job here is to catch a typo like "ali@" or a
// missing @, not to police the RFC. The server is the real authority.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

export default function SignUp() {
  const { signUp } = useAuth();
  const { showToast } = useApp();
  const { t } = useLang();
  const navigate = useNavigate();

  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSentTo, setConfirmSentTo] = useState(null);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setFormError(null);
  };

  function validate() {
    const e = {};
    if (!form.fullName.trim()) e.fullName = t('auth.errNameReq');

    if (!form.email.trim()) e.email = t('auth.errEmailReq');
    else if (!EMAIL_RE.test(form.email.trim())) e.email = t('auth.errEmailFormat');

    if (!form.password) e.password = t('auth.errPasswordReq');
    else if (form.password.length < MIN_PASSWORD) e.password = t('auth.errPasswordShort');

    if (!form.confirm) e.confirm = t('auth.errConfirmReq');
    else if (form.confirm !== form.password) e.confirm = t('auth.errPasswordMatch');

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    const { error, duplicate, needsEmailConfirmation } = await signUp(
      form.fullName,
      form.email,
      form.password
    );
    setSubmitting(false);

    if (error) {
      const key = authErrorKey(error);
      // A duplicate email is a field problem, not a page problem — put it on
      // the field the user has to change.
      if (key === 'auth.errDuplicate') setErrors((e) => ({ ...e, email: t(key) }));
      else setFormError(t(key));
      return;
    }

    if (duplicate) {
      setErrors((e) => ({ ...e, email: t('auth.errDuplicate') }));
      return;
    }

    if (needsEmailConfirmation) {
      // Confirmation is on in the Supabase project: the account exists but
      // there is no session yet, so there is nothing to redirect into.
      setConfirmSentTo(form.email.trim());
      return;
    }

    showToast(t('auth.signUpSuccess'));
    navigate('/dashboard', { replace: true });
  }

  if (confirmSentTo) {
    return (
      <AuthShell>
        <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
          <div className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <h1 className="mt-5 text-xl font-bold text-gray-900">{t('auth.confirmEmailTitle')}</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              {t('auth.confirmEmailBody', { email: confirmSentTo })}
            </p>
            <Link
              to="/signin"
              className="mt-6 inline-block rounded-lg bg-primary-700 px-6 py-3 text-sm font-bold text-white hover:bg-primary-800"
            >
              {t('auth.backToSignIn')}
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('auth.signUpTitle')}</h1>
          <p className="mt-1.5 text-sm text-gray-500">{t('auth.signUpSub')}</p>

          {formError && (
            <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {formError}
            </div>
          )}

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            <FormField id="fullName" label={t('auth.fullName')} error={errors.fullName}>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder={t('auth.egFullName')}
                value={form.fullName}
                onChange={(e) => set('fullName', e.target.value)}
                aria-invalid={!!errors.fullName}
                aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                className={fieldInputCls(errors.fullName)}
              />
            </FormField>

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
                autoComplete="new-password"
                placeholder={t('auth.egPassword')}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className={fieldInputCls(errors.password) + ' latin'}
              />
            </FormField>

            <FormField id="confirm" label={t('auth.confirmPassword')} error={errors.confirm}>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => set('confirm', e.target.value)}
                aria-invalid={!!errors.confirm}
                aria-describedby={errors.confirm ? 'confirm-error' : undefined}
                className={fieldInputCls(errors.confirm) + ' latin'}
              />
            </FormField>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-primary-700 px-4 py-3.5 text-base font-bold text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {submitting ? t('auth.signingUp') : t('auth.signUpSubmit')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            {t('auth.haveAccount')}{' '}
            <Link to="/signin" className="font-bold text-primary-700 hover:text-primary-900">
              {t('auth.signIn')}
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
