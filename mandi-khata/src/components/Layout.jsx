import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Toast from './Toast';

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'M2.25 12 11.204 3.045c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75' },
  { to: '/new-sale', label: 'New Sale', icon: 'M12 4.5v15m7.5-7.5h-15' },
  { to: '/roznamcha', label: 'Roznamcha', icon: 'M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25' },
  { to: '/khatas', label: 'Khatas', icon: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z' },
  { to: '/cash-entry', label: 'Cash Entry', icon: 'M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z' },
  { to: '/reports', label: 'Reports', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z', ownerOnly: true },
];

function Icon({ d, className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export default function Layout({ children }) {
  const { role, setRole } = useApp();
  const location = useLocation();
  const items = NAV.filter((n) => !n.ownerOnly || role === 'malik');
  const current = NAV.find((n) => (n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to)));

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-primary-900 md:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-lg font-extrabold text-white">MK</div>
          <div>
            <p className="text-base font-bold text-white">Mandi Khata</p>
            <p className="text-xs text-primary-300">Fish Mandi Hisaab</p>
          </div>
        </div>
        <nav className="mt-2 flex-1 space-y-1 px-3">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                isActive
                  ? 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-primary-700 text-white'
                  : 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary-200 hover:bg-primary-800 hover:text-white'
              }
            >
              <Icon d={n.icon} className="h-5 w-5" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 text-xs text-primary-400">Demo — data session mein hi rehta hai</div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white pl-4 pr-3 md:left-60">
        <div className="flex items-center gap-2 md:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-800 text-sm font-extrabold text-white">MK</div>
          <span className="text-base font-bold text-primary-900">{current ? current.label : 'Mandi Khata'}</span>
        </div>
        <span className="hidden text-lg font-bold text-gray-800 md:block">{current ? current.label : ''}</span>
        <label className="flex items-center gap-2">
          <span className="hidden text-xs font-medium text-gray-500 sm:block">Role:</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-800 outline-none focus:border-primary-500"
          >
            <option value="malik">Malik (Owner)</option>
            <option value="munshi">Munshi (Clerk)</option>
          </select>
        </label>
      </header>

      <main className="px-4 pb-24 pt-20 md:ml-60 md:px-8 md:pb-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-gray-200 bg-white md:hidden">
        {items.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              isActive
                ? 'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-primary-700'
                : 'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-gray-400'
            }
          >
            <Icon d={n.icon} className="h-5 w-5" />
            {n.label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>

      <Toast />
    </div>
  );
}
