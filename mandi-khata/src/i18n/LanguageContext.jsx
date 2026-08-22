import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations, MONTHS, MERIDIEM } from './translations';
import { formatPKR, formatKg } from '../utils/money';

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
  //
  // Every currency string in the app is produced here, by formatPKR. No
  // component formats an amount itself, and nothing here does arithmetic on
  // one — the only transformation is swapping the currency word for Urdu.
  const fmt = useMemo(() => {
    const rs = (paisa) => {
      const en = formatPKR(paisa || 0); // "Rs. 1,25,000.00" or "-Rs. 1,25,000.00"
      if (lang !== 'ur') return en;
      const negative = en.startsWith('-');
      return `${negative ? '-' : ''}${en.replace(/^-?Rs\.\s*/, '')} روپے`;
    };
    return {
      rs,
      // Bare grouped digits, no currency word — for chart labels and axes.
      num(paisa) {
        return formatPKR(paisa || 0).replace(/^-?Rs\.\s*/, '').replace(/\.\d{2}$/, '');
      },
      kg(grams) {
        const n = formatKg(grams || 0);
        return lang === 'ur' ? `${n} کلو` : `${n} kg`;
      },
      ratePerKg(paisaPerKg) {
        return lang === 'ur' ? `${rs(paisaPerKg)} فی کلو` : `${rs(paisaPerKg)}/kg`;
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
    };
  }, [lang]);

  // Party names and areas carry an Urdu spelling in the mock data.
  const partyName = useCallback((p) => (p ? (lang === 'ur' ? p.nameUr : p.name) : ''), [lang]);
  // Fish types are per-shop rows now, so their names are data, not i18n keys.
  const fishName = useCallback((f) => (f ? (lang === 'ur' ? f.nameUr || f.name : f.name) : ''), [lang]);
  const partyArea = useCallback((p) => (p ? (lang === 'ur' ? p.areaUr : p.area) : ''), [lang]);
  const cashNote = useCallback((c) => (c ? (lang === 'ur' ? c.noteUr || c.note : c.note) : ''), [lang]);

  const value = useMemo(
    () => ({ lang, setLang, dir, t, fmt, partyName, partyArea, cashNote, fishName }),
    [lang, dir, t, fmt, partyName, partyArea, cashNote, fishName]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider');
  return ctx;
}
