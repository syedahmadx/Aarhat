import { Link } from 'react-router-dom';
import { useLang } from '../i18n/LanguageContext';
import AuthShell from '../components/AuthShell';

const FEATURES = [
  {
    key: 'f1',
    icon: 'M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  },
  {
    key: 'f2',
    icon: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
  },
  {
    key: 'f3',
    icon: 'M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25',
  },
  {
    key: 'f4',
    icon: 'M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3',
  },
];

export default function Landing() {
  const { t } = useLang();

  return (
    <AuthShell wide>
      {/* Hero */}
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-700">
              {t('app.tagline')}
            </span>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-primary-900 sm:text-5xl">
              {t('land.heroTitle')}
            </h1>
            <p className="mt-5 text-base leading-relaxed text-gray-600 sm:text-lg">{t('land.heroBody')}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="rounded-lg bg-primary-700 px-7 py-3.5 text-center text-base font-bold text-white shadow-sm transition hover:bg-primary-800"
              >
                {t('auth.getStarted')}
              </Link>
              <Link
                to="/signin"
                className="rounded-lg border border-gray-300 bg-white px-7 py-3.5 text-center text-base font-bold text-gray-800 transition hover:border-primary-400 hover:bg-gray-50"
              >
                {t('auth.signIn')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t('land.featuresTitle')}</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.key} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-bold text-gray-900">{t(`land.${f.key}Title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{t(`land.${f.key}Body`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing call to action */}
      <section className="border-t border-gray-200 bg-primary-900">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-2xl font-bold text-white">{t('land.ctaTitle')}</h2>
            <p className="mt-2 text-sm text-primary-200">{t('land.ctaBody')}</p>
          </div>
          <Link
            to="/signup"
            className="shrink-0 rounded-lg bg-white px-7 py-3.5 text-base font-bold text-primary-900 transition hover:bg-primary-50"
          >
            {t('auth.getStarted')}
          </Link>
        </div>
      </section>
    </AuthShell>
  );
}
