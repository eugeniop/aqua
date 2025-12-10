import { useEffect, useMemo, useState } from 'react';
import { translations as appTranslations } from '../i18n/translations.js';
import { useTranslation } from '../i18n/LocalizationProvider.jsx';
import './AccessNotice.css';

export default function AccessNotice({ message, translations = {}, onLogout }) {
  const { t } = useTranslation();
  const availableLanguages = useMemo(() => {
    const keys = new Set(Object.keys(appTranslations));
    Object.keys(translations || {}).forEach((lang) => keys.add(lang));
    return Array.from(keys);
  }, [translations]);

  const [selectedLanguage, setSelectedLanguage] = useState(() => availableLanguages[0] || 'en');

  useEffect(() => {
    if (availableLanguages.includes(selectedLanguage)) {
      return;
    }
    setSelectedLanguage(availableLanguages[0] || 'en');
  }, [availableLanguages, selectedLanguage]);

  const resolvedMessage = translations[selectedLanguage] || translations.en || message;

  return (
    <div className="access-notice">
      <div className="access-card">
        <h1>{t('Access restricted')}</h1>
        <p className="notice-message">{resolvedMessage || message}</p>
        {availableLanguages.length > 0 && (
          <label className="language-picker">
            <span>{t('View in another language')}:</span>
            <select
              value={selectedLanguage}
              onChange={(event) => setSelectedLanguage(event.target.value)}
              aria-label={t('Language selection for access notice')}
            >
              {availableLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="notice-actions">
          <button type="button" className="secondary" onClick={onLogout}>
            {t('Return to login')}
          </button>
        </div>
      </div>
    </div>
  );
}
