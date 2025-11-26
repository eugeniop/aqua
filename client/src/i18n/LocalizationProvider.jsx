import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from './translations.js';

const LocalizationContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key, vars) => key
});

const DEFAULT_LANGUAGE = 'en';
const STORAGE_KEY = 'aqua-language';

const formatTemplate = (template, vars = {}) =>
  template.replace(/\{(\w+)\}/g, (_, token) =>
    Object.prototype.hasOwnProperty.call(vars, token) ? vars[token] : `{${token}}`
  );

export function LocalizationProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return stored || DEFAULT_LANGUAGE;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const translate = useCallback(
    (key, vars = {}) => {
      const template = translations[language]?.[key] ?? translations[DEFAULT_LANGUAGE]?.[key] ?? key;
      if (typeof template !== 'string') {
        return key;
      }
      return formatTemplate(template, vars);
    },
    [language]
  );

  const setLanguage = useCallback((value) => {
    setLanguageState(value);
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: translate
    }),
    [language, setLanguage, translate]
  );

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export const useTranslation = () => useContext(LocalizationContext);
