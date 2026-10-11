import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { dict } from '../i18n.js';

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

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
