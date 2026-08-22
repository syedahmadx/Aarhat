import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useLang } from '../i18n/LanguageContext';
import FormField, { fieldInputCls } from '../components/FormField';
import EmptyState from '../components/EmptyState';

export default function Profile() {
  const { profile, user, updateProfile, loading } = useAuth();
  const { showToast } = useApp();
  const { t } = useLang();

  const [fullName, setFullName] = useState('');
  const [error, setError] = useState(null);
  const [fieldError, setFieldError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Seed the input once the profile arrives from Supabase.
  useEffect(() => {
    if (profile?.full_name !== undefined) setFullName(profile.full_name ?? '');
  }, [profile?.full_name]);

  if (!loading && !profile) {
    return <EmptyState title={t('prof.noProfile')} subtitle={t('prof.noProfileSub')} />;
  }

  const dirty = profile ? fullName.trim() !== (profile.full_name ?? '') : false;

  async function onSubmit(ev) {
    ev.preventDefault();
    setError(null);
    setFieldError(null);

    if (!fullName.trim()) {
      setFieldError(t('auth.errNameReq'));
      return;
    }

    setSaving(true);
    // Only full_name is sent. role and shop_id decide what a user may do, so
    // they are never editable from here.
    const { error: saveError } = await updateProfile({ full_name: fullName.trim() });
    setSaving(false);

    if (saveError) {
      setError(t('prof.saveError'));
      return;
    }
    showToast(t('prof.saved'));
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('prof.title')}</h1>
        <p className="text-sm text-gray-500">{t('prof.subtitle')}</p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-4 border-b border-gray-100 pb-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-800">
            {(profile?.full_name || profile?.email || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-gray-900">{profile?.full_name || '—'}</p>
            <p className="latin truncate text-sm text-gray-500">{profile?.email || user?.email}</p>
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
          <FormField id="full_name" label={t('auth.fullName')} error={fieldError}>
            <input
              id="full_name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setFieldError(null);
                setError(null);
              }}
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? 'full_name-error' : undefined}
              className={fieldInputCls(fieldError)}
            />
          </FormField>

          <FormField id="profile_email" label={t('auth.email')} hint={t('prof.emailNote')}>
            <input
              id="profile_email"
              type="email"
              value={profile?.email || user?.email || ''}
              readOnly
              disabled
              className="latin w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-500"
            />
          </FormField>

          <button
            type="submit"
            disabled={saving || !dirty}
            className="w-full rounded-lg bg-primary-700 px-4 py-3.5 text-base font-bold text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {saving ? t('prof.saving') : t('prof.save')}
          </button>
        </form>
      </div>
    </div>
  );
}
