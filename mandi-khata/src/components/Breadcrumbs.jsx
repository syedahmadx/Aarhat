import { Link, useNavigate } from 'react-router-dom';
import { useLang } from '../i18n/LanguageContext';

/**
 * Trail plus a back control. `items` is [{ label, to }] for the clickable
 * ancestors; `current` is the page itself, rendered as plain text. Back goes
 * to the previous history entry — the list the user actually came from,
 * filters and page intact — falling back to the first ancestor for a tab
 * opened directly on this page.
 */
export default function Breadcrumbs({ items, current }) {
  const { t } = useLang();
  const navigate = useNavigate();

  const fallback = items[0]?.to ?? '/dashboard';
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallback);
  };

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2">
      <button
        type="button"
        onClick={goBack}
        aria-label={t('crumb.back')}
        title={t('crumb.back')}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-primary-400 hover:text-primary-700"
      >
        <svg className="h-4 w-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </button>
      <ol className="flex min-w-0 items-center gap-2 text-sm">
        {items.map((item) => (
          <li key={item.to} className="flex items-center gap-2">
            <Link to={item.to} className="font-semibold text-primary-700 hover:text-primary-900">
              {item.label}
            </Link>
            <svg className="h-3.5 w-3.5 shrink-0 text-gray-300 rtl:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </li>
        ))}
        <li aria-current="page" className="truncate font-semibold text-gray-500">{current}</li>
      </ol>
    </nav>
  );
}
