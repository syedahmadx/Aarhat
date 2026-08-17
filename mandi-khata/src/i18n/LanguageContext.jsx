import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations, MONTHS, MERIDIEM } from './translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en'); // 'en' | 'ur'
  const dir = lang === 'ur' ? 'rtl' : 'ltr';

  // Drive document direction so Tailwind's logical properties (ms-/ps-/start-)
  // and native text alignment flip for Urdu.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const t = useCallback(
    (key, params) => {
      let s = translations[lang][key] ?? translations.en[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, v);
      }
      return s;
    },
    [lang]
  );

  // Locale-aware formatters. Digits stay Latin in both languages — Pakistani
  // commerce writes amounts as 1,25,000 regardless of script.
  const fmt = useMemo(
    () => ({
      rs(amount) {
        const n = Math.round(Math.abs(amount || 0)).toLocaleString('en-IN');
        return lang === 'ur' ? `${n} روپے` : `Rs. ${n}`;
      },
      num(amount) {
        return Math.round(Math.abs(amount || 0)).toLocaleString('en-IN');
      },
      date(iso) {
        if (!iso) return '';
        const [y, m, d] = iso.split('-').map(Number);
        return `${d} ${MONTHS[lang][m - 1]} ${y}`;
      },
      shortDate(iso) {
        if (!iso) return '';
        const [, m, d] = iso.split('-').map(Number);
        return `${d} ${MONTHS[lang][m - 1]}`;
      },
      time(hhmm) {
        if (!hhmm) return '';
        const [h, m] = hhmm.split(':').map(Number);
        const mer = h >= 12 ? MERIDIEM[lang].pm : MERIDIEM[lang].am;
        const hh = h % 12 === 0 ? 12 : h % 12;
        return `${hh}:${String(m).padStart(2, '0')} ${mer}`;
      },
    }),
    [lang]
  );

  // Party names and areas carry an Urdu spelling in the mock data.
  const partyName = useCallback((p) => (p ? (lang === 'ur' ? p.nameUr : p.name) : ''), [lang]);
  const partyArea = useCallback((p) => (p ? (lang === 'ur' ? p.areaUr : p.area) : ''), [lang]);
  const cashNote = useCallback((c) => (c ? (lang === 'ur' ? c.noteUr || c.note : c.note) : ''), [lang]);

  const value = useMemo(
    () => ({ lang, setLang, dir, t, fmt, partyName, partyArea, cashNote }),
    [lang, dir, t, fmt, partyName, partyArea, cashNote]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider');
  return ctx;
}
