import { Link } from 'react-router-dom';
import { useLang } from '../i18n/LanguageContext';
import Toast from './Toast';

// Chrome for the pages that exist outside the signed-in app: landing, sign-in
// and sign-up. Deliberately not the ledger Layout — there is no sidebar, no
// role switcher and no nav, because none of it applies to a signed-out user.
// Toast renders here too, since AppProvider wraps the whole tree.
function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex overflow-hidden rounded-lg border border-gray-300" role="group" aria-label="Language">
      <button
        type="button"
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        className={`latin px-2.5 py-1.5 text-xs font-bold ${lang === 'en' ? 'bg-primary-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('ur')}
        aria-pressed={lang === 'ur'}
        className={`px-2.5 py-1 text-sm font-bold ${lang === 'ur' ? 'bg-primary-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
        style={{ fontFamily: 'var(--font-urdu)' }}
      >
        اردو
      </button>
    </div>
  );
}

export default function AuthShell({ children, wide = false }) {
  const { t } = useLang();
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className={`mx-auto flex h-16 items-center justify-between px-4 sm:px-6 ${wide ? 'max-w-6xl' : 'max-w-5xl'}`}>
          <Link to="/" className="flex items-center gap-2.5">
            <div className="latin flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-800 text-base font-extrabold text-white">
              MK
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-primary-900">{t('app.name')}</p>
              <p className="truncate text-xs text-gray-500">{t('app.tagline')}</p>
            </div>
          </Link>
          <LangToggle />
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-gray-200 bg-white">
        <div className={`mx-auto px-4 py-5 text-center text-xs text-gray-400 sm:px-6 ${wide ? 'max-w-6xl' : 'max-w-5xl'}`}>
          {t('app.demoNote')}
        </div>
      </footer>

      <Toast />
    </div>
  );
}
