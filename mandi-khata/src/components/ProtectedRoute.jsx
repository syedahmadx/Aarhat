import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

/** Signed-out users are sent to /signin, remembering where they were headed. */
export function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <SessionLoading />;
  if (!session) return <Navigate to="/signin" replace state={{ from: location }} />;
  return children;
}

/** Signed-in users have no business on /signin or /signup. */
export function PublicOnlyRoute({ children }) {
  const { session, loading } = useAuth();

  if (loading) return <SessionLoading />;
  if (session) return <Navigate to="/dashboard" replace />;
  return children;
}

export { SessionLoading };
