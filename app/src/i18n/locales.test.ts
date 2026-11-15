import { describe, expect, it } from 'vitest';
import en from './locales/en.json';
import ptPT from './locales/pt-PT.json';

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? keys(value as object, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('locales', () => {
  it('pt-PT and en define exactly the same keys', () => {
    expect(keys(en).sort()).toEqual(keys(ptPT).sort());
  });

  it('has no empty strings', () => {
    for (const locale of [en, ptPT]) {
      const values = JSON.stringify(locale).match(/:""/g);
      expect(values).toBeNull();
    }
  });
});
