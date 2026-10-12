import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { dict, DISH_EN, CATEGORY_EN } from '../i18n.js';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('bfvr_lang') || 'hi');

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l) => {
    localStorage.setItem('bfvr_lang', l);
    setLangState(l);
  }, []);

  const t = useCallback(
    (key, vars) => {
      let s = dict[lang]?.[key];
      if (s == null) s = dict.hi[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
      }
      return s;
    },
    [lang]
  );

  // Dish name in the current language. Accepts a plain string or an item object
  // ({ name, nameEn? }). Server-provided nameEn wins; DISH_EN covers the standard
  // menu card; Hindi mode always shows the stored (Hindi) name.
  const dish = useCallback(
    (x) => {
      if (x == null) return '';
      if (lang !== 'en') return typeof x === 'string' ? x : x.name || '';
      if (typeof x === 'string') return DISH_EN[x] || x;
      return x.nameEn || DISH_EN[x.name] || x.name || '';
    },
    [lang]
  );

  // Category label in the current language (falls back to the stored value).
  const cat = useCallback((c) => (lang === 'en' ? CATEGORY_EN[c] || c : c), [lang]);

  return <LangContext.Provider value={{ lang, setLang, t, dish, cat }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
