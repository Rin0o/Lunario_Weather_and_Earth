import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  detectLanguage,
  type Language,
} from './language.ts';
import en from './locales/en.json';
import ptPT from './locales/pt-PT.json';

export const resources = {
  'pt-PT': { translation: ptPT },
  en: { translation: en },
} as const;

export async function initI18n(lng: Language = detectLanguage()) {
  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: { escapeValue: false },
  });
  document.documentElement.lang = i18n.resolvedLanguage ?? lng;
  i18n.on('languageChanged', (next) => {
    document.documentElement.lang = next;
  });
  return i18n;
}
