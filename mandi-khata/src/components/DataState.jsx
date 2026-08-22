import { useApp } from '../context/AppContext';
import { useLang } from '../i18n/LanguageContext';

// Loading and error presentation for every data-connected screen, applied
// once in Layout rather than re-implemented seven times.

export function Skeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      <div className="space-y-2">
        <div className="h-6 w-44 rounded-md bg-gray-200" />
        <div className="h-4 w-64 rounded-md bg-gray-100" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="mt-3 h-5 w-24 rounded bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 border-b border-gray-50 px-5 py-4 last:border-0">
            <div className="h-9 w-9 shrink-0 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-1/3 rounded bg-gray-200" />
              <div className="h-3 w-1/2 rounded bg-gray-100" />
            </div>
            <div className="h-4 w-20 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState() {
  const { reload } = useApp();
  const { t } = useLang();
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-100 bg-white px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>
      <p className="mt-4 text-base font-semibold text-gray-800">{t('state.errorTitle')}</p>
      <p className="mt-1 text-sm text-gray-500">{t('state.errorSub')}</p>
      <button
        type="button"
        onClick={reload}
        className="mt-5 rounded-lg bg-primary-700 px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-800"
      >
        {t('state.retry')}
      </button>
    </div>
  );
}

/**
 * Gates children on the data layer's state: skeleton while the initial load
 * runs, an error card with retry if it failed, children once rows are in.
 */
export default function DataState({ children }) {
  const { loading, error } = useApp();
  if (loading) return <Skeleton />;
  if (error) return <ErrorState />;
  return children;
}
