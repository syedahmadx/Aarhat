import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DATA_SOURCE } from '../data/repo';
import { useLang } from '../i18n/LanguageContext';

// Shown while the persisted session is still resolving. Without this, a
// signed-in user returning to the app would see the sign-in page flash before
// being bounced back — which reads as "it logged me out".
function SessionLoading() {
  const { t } = useLang();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-200 border-t-primary-700"
          role="status"
          aria-label={t('auth.loading')}
        />
        <p className="text-sm font-medium text-gray-500">{t('auth.loading')}</p>
      </div>
    </div>
  );
}

/**
 * Signed-out users are sent to /signin, remembering where they were headed.
 * Signed-in users without a shop are sent to /setup: every RLS policy in the
 * ledger schema checks shop_id, so until onboarding runs the app would show
 * a signed-in user nothing at all — forced onboarding beats looking broken.
 */
export function ProtectedRoute({ children }) {
  const { session, loading, profile, profileLoading } = useAuth();
  const location = useLocation();

  if (loading) return <SessionLoading />;
  if (!session) return <Navigate to="/signin" replace state={{ from: location }} />;
  // The shop gate exists because RLS-scoped reads return nothing without a
  // shop_id — a live-data concern. Mock mode has no RLS, so forcing its
  // users through onboarding would gate them on a database they don't use.
  if (DATA_SOURCE === 'supabase') {
    // The shop decision must wait for the profile row, not run on its
    // absence: right after sign-in the session exists a beat before the
    // profile does, and deciding then would bounce a malik to /setup.
    if (profileLoading) return <SessionLoading />;
    if (!profile?.shop_id) return <Navigate to="/setup" replace />;
  }
  return children;
}

/** Signed-in users have no business on /signin or /signup. */
export function PublicOnlyRoute({ children }) {
  const { session, loading } = useAuth();

  if (loading) return <SessionLoading />;
  if (session) return <Navigate to="/dashboard" replace />;
  return children;
}

/**
 * /setup is the inverse of the shop gate: it needs a session but must NOT
 * have a shop — a user who already onboarded gets sent to the dashboard,
 * matching the database function, which refuses a second shop anyway.
 */
export function SetupRoute({ children }) {
  const { session, loading, profile, profileLoading } = useAuth();

  if (loading || (session && profileLoading)) return <SessionLoading />;
  if (!session) return <Navigate to="/signin" replace />;
  if (profile?.shop_id) return <Navigate to="/dashboard" replace />;
  return children;
}

export { SessionLoading };
