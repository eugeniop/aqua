import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_TIME_ZONE } from '../constants/timeZones.js';
import { translations } from './translations.js';

const LocalizationContext = createContext({
  language: 'en',
  setLanguage: () => {},
  timeZone: 'Africa/Dar_es_Salaam',
  setTimeZone: () => {},
  t: (key, vars) => key,
  formatDateTime: (value) => value
});

const DEFAULT_LANGUAGE = 'en';
const STORAGE_KEY = 'aqua-language';
const TIMEZONE_STORAGE_KEY = 'aqua-timezone';

const formatTemplate = (template, vars = {}) =>
  template.replace(/\{(\w+)\}/g, (_, token) =>
    Object.prototype.hasOwnProperty.call(vars, token) ? vars[token] : `{${token}}`
  );

export function LocalizationProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return stored || DEFAULT_LANGUAGE;
  });
  const [timeZone, setTimeZoneState] = useState(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_TIME_ZONE;
    }
    const stored = localStorage.getItem(TIMEZONE_STORAGE_KEY);
    if (stored) {
      return stored;
    }
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return resolved || DEFAULT_TIME_ZONE;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(TIMEZONE_STORAGE_KEY, timeZone);
  }, [timeZone]);

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

  const setTimeZone = useCallback((value) => {
    setTimeZoneState(value);
  }, []);

  const formatDateTime = useCallback(
    (value, options = { dateStyle: 'medium', timeStyle: 'short' }) => {
      if (!value) {
        return '—';
      }
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) {
        return '—';
      }
      try {
        return new Intl.DateTimeFormat(language, { timeZone, ...options }).format(date);
      } catch (error) {
        return date.toLocaleString();
      }
    },
    [language, timeZone]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      timeZone,
      setTimeZone,
      t: translate,
      formatDateTime
    }),
    [language, setLanguage, timeZone, setTimeZone, translate, formatDateTime]
  );

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export const useTranslation = () => useContext(LocalizationContext);
