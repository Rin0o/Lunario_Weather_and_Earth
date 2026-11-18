export const SUPPORTED_LANGUAGES = ['pt-PT', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'pt-PT';

const STORAGE_KEY = 'lunario.language';

export function isSupportedLanguage(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function persistLanguage(lang: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Storage may be unavailable (private mode); the choice then lasts for the session only.
  }
}

/**
 * The choice stored in Settings, or pt-PT. The browser's language is not used: the app is
 * Portuguese first, and English is a choice the user makes.
 */
export function detectLanguage(): Language {
  const stored = readStored();
  return stored && isSupportedLanguage(stored) ? stored : DEFAULT_LANGUAGE;
}
