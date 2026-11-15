import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, isSupportedLanguage, persistLanguage } from '../i18n/language.ts';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  return (
    <label className="language-switcher">
      <span className="visually-hidden">{t('language.label')}</span>
      <select
        value={i18n.resolvedLanguage}
        onChange={(event) => {
          const lang = event.target.value;
          if (!isSupportedLanguage(lang)) return;
          persistLanguage(lang);
          void i18n.changeLanguage(lang);
        }}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {t(`language.names.${lang}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
