import { describe, expect, it } from 'vitest';
import { DEFAULT_LANGUAGE, detectLanguage, matchLanguage, persistLanguage } from './language.ts';

describe('matchLanguage', () => {
  it.each([
    ['pt-PT', 'pt-PT'],
    ['pt-BR', 'pt-PT'],
    ['pt', 'pt-PT'],
    ['en-GB', 'en'],
    ['EN-us', 'en'],
    ['fr-FR', undefined],
    [undefined, undefined],
  ])('maps %s to %s', (tag, expected) => {
    expect(matchLanguage(tag)).toBe(expected);
  });
});

describe('detectLanguage', () => {
  it('defaults to pt-PT when nothing matches', () => {
    expect(detectLanguage(['fr-FR', 'de'])).toBe(DEFAULT_LANGUAGE);
    expect(detectLanguage([])).toBe(DEFAULT_LANGUAGE);
  });

  it('uses the first supported browser language', () => {
    expect(detectLanguage(['fr-FR', 'en-GB', 'pt-PT'])).toBe('en');
  });

  it('prefers a stored choice over the browser languages', () => {
    persistLanguage('en');
    expect(detectLanguage(['pt-PT'])).toBe('en');
  });

  it('ignores an invalid stored value', () => {
    localStorage.setItem('lunario.language', 'xx');
    expect(detectLanguage(['en'])).toBe('en');
  });
});
