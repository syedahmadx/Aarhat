import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../i18n/LanguageContext';
import Toast from './Toast';
import DataState from './DataState';

// Grouped by how an arhti's day runs: the four screens touched constantly,
// then the account-keeping ones.
const NAV = [
  { to: '/dashboard', group: 'daily', key: 'nav.dashboard', icon: 'M2.25 12 11.204 3.045c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75' },
  { to: '/new-sale', group: 'daily', key: 'nav.newSale', icon: 'M12 4.5v15m7.5-7.5h-15' },
  { to: '/roznamcha', group: 'daily', key: 'nav.roznamcha', icon: 'M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25' },
  { to: '/khatas', group: 'accounts', key: 'nav.khatas', icon: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z' },
  { to: '/cash-entry', group: 'daily', key: 'nav.cashEntry', icon: 'M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z' },
  { to: '/reports', group: 'accounts', key: 'nav.reports', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z', ownerOnly: true },
];

function Icon({ d, className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

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

// Profile link plus sign-out.
function UserMenu() {
  const { profile, user, signOut } = useAuth();
  const { showToast } = useApp();
  const { t } = useLang();
  const navigate = useNavigate();

  const label = profile?.full_name || profile?.email || user?.email || '';
  const initial = label ? label.charAt(0).toUpperCase() : '?';

  async function onSignOut() {
    await signOut();
    showToast(t('auth.signOutSuccess'));
    navigate('/', { replace: true });
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        to="/profile"
        title={label}
        aria-label={t('prof.nav')}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-800 transition hover:bg-primary-200"
      >
        <span className="latin">{initial}</span>
      </Link>
      <button
        type="button"
        onClick={onSignOut}
        aria-label={t('auth.signOut')}
        title={t('auth.signOut')}
        className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
      >
        <svg className="h-5 w-5 rtl:-scale-x-100" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
        </svg>
      </button>
    </div>
  );
}

// Read-only identity: who is signed in and what the profiles row says they
// are. This replaced the mock-era dropdown that let anyone pick their own
// role — role is data about the user, not a preference.
function RoleBadge() {
  const { profile, user } = useAuth();
  const { role } = useApp();
  const { t } = useLang();
  const name = profile?.full_name || user?.email?.split('@')[0] || '';
  return (
    <span
      className="hidden max-w-40 items-center gap-1.5 truncate rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-700 sm:inline-flex"
      title={`${name} · ${t(role === 'malik' ? 'role.badgeMalik' : 'role.badgeMunshi')}`}
    >
      <span className="truncate">{name}</span>
      <span className="text-gray-400">·</span>
      <span className={role === 'malik' ? 'text-primary-700' : 'text-amber-700'}>
        {t(role === 'malik' ? 'role.badgeMalik' : 'role.badgeMunshi')}
      </span>
    </span>
  );
}

export default function Layout({ children }) {
  const { role } = useApp();
  const { t } = useLang();
  const location = useLocation();
  const items = NAV.filter((n) => !n.ownerOnly || role === 'malik');
  const current =
    NAV.find((n) => location.pathname.startsWith(n.to)) ||
    (location.pathname.startsWith('/profile') ? { key: 'prof.nav' } : null);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-60 flex-col bg-primary-900 md:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="latin flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-lg font-extrabold text-white">MK</div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-white">{t('app.name')}</p>
            <p className="truncate text-xs text-primary-300">{t('app.tagline')}</p>
          </div>
        </div>
        <nav className="mt-2 flex-1 px-3">
          {[['daily', 'nav.groupDaily'], ['accounts', 'nav.groupAccounts']].map(([group, groupKey]) => (
            <div key={group} className="mb-4">
              <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-400">
                {t(groupKey)}
              </p>
              <div className="space-y-1">
                {items.filter((n) => n.group === group).map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    className={({ isActive }) =>
                      isActive
                        ? 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-primary-700 text-white'
                        : 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary-200 hover:bg-primary-800 hover:text-white'
                    }
                  >
                    <Icon d={n.icon} className="h-5 w-5 shrink-0" />
                    {t(n.key)}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white ps-4 pe-3 md:ms-60">
        <div className="flex items-center gap-2 md:hidden">
          <div className="latin flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-800 text-sm font-extrabold text-white">MK</div>
          <span className="truncate text-base font-bold text-primary-900">{current ? t(current.key) : t('app.name')}</span>
        </div>
        <span className="hidden text-lg font-bold text-gray-800 md:block">{current ? t(current.key) : ''}</span>
        <div className="flex items-center gap-2">
          <LangToggle />
          <RoleBadge />
          <UserMenu />
        </div>
      </header>

      <main className="px-4 pb-24 pt-20 md:ms-60 md:px-8 md:pb-10">
        <div className="mx-auto max-w-5xl">
          {location.pathname.startsWith('/profile') ? children : <DataState>{children}</DataState>}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-gray-200 bg-white md:hidden">
        {[...items].sort((a, b) => (a.group === 'daily' ? 0 : 1) - (b.group === 'daily' ? 0 : 1)).map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              isActive
                ? 'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-primary-700'
                : 'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-gray-400'
            }
          >
            <Icon d={n.icon} className="h-5 w-5" />
            <span className="truncate px-0.5">{t(n.key).split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>

      <Toast />
    </div>
  );
}
