import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App.tsx';
import { initI18n } from './i18n/index.ts';

describe('App', () => {
  beforeEach(async () => {
    await initI18n('pt-PT');
  });

  it('renders the shell in Portuguese by default', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Lunário' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Hoje' })).toBeInTheDocument();
    expect(screen.getByText(`Versão ${__APP_VERSION__}`)).toBeInTheDocument();
  });

  it('switches to English and remembers the choice', async () => {
    render(<App />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Idioma' }), 'en');

    expect(await screen.findByRole('heading', { level: 2, name: 'Today' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem('lunario.language')).toBe('en');
  });
});
