import { describe, expect, it } from 'vitest';
import { DEFAULT_LANGUAGE, detectLanguage, persistLanguage } from './language.ts';

describe('detectLanguage', () => {
  it('is Portuguese by default, whatever the browser language', () => {
    localStorage.removeItem('lunario.language');
    expect(DEFAULT_LANGUAGE).toBe('pt-PT');
    expect(detectLanguage()).toBe('pt-PT');
  });

  it('uses the choice stored in Settings', () => {
    persistLanguage('en');
    expect(detectLanguage()).toBe('en');
  });

  it('ignores an invalid stored value', () => {
    localStorage.setItem('lunario.language', 'xx');
    expect(detectLanguage()).toBe('pt-PT');
  });
});
