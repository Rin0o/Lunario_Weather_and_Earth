import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from 'i18next';
import { initI18n } from '../i18n/index.ts';
import { LanguageSwitcher } from './LanguageSwitcher.tsx';

describe('LanguageSwitcher', () => {
  beforeEach(async () => {
    await initI18n('pt-PT');
  });

  it('lists every supported language', () => {
    render(<LanguageSwitcher />);
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['Português', 'English']);
  });

  it('ignores values that are not supported languages', () => {
    render(<LanguageSwitcher />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'xx' } });
    expect(i18n.language).toBe('pt-PT');
    expect(localStorage.getItem('lunario.language')).toBeNull();
  });
});
