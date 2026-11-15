export const SUPPORTED_LANGUAGES = ['pt-PT', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'pt-PT';

const STORAGE_KEY = 'lunario.language';

export function isSupportedLanguage(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/** Maps a BCP 47 tag (e.g. "en-GB", "pt-BR") to a supported language. */
export function matchLanguage(tag: string | undefined): Language | undefined {
  if (!tag) return undefined;
  const primary = tag.toLowerCase().split('-')[0];
  if (primary === 'pt') return 'pt-PT';
  if (primary === 'en') return 'en';
  return undefined;
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

/** Stored choice first, then the browser's preferred languages, then pt-PT. */
export function detectLanguage(
  preferred: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages,
): Language {
  const stored = readStored();
  if (stored && isSupportedLanguage(stored)) return stored;
  for (const tag of preferred) {
    const match = matchLanguage(tag);
    if (match) return match;
  }
  return DEFAULT_LANGUAGE;
}
