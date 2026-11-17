import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App.tsx';
import { initI18n } from './i18n/index.ts';

const goTo = (hash: string) =>
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

describe('App', () => {
  beforeEach(async () => {
    await initI18n('pt-PT');
  });

  afterEach(() => {
    window.location.hash = '';
  });

  it('renders the shell in Portuguese by default', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Lunário' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Hoje' })).toBeInTheDocument();
    expect(screen.getByText(`Versão ${__APP_VERSION__}`)).toBeInTheDocument();
  });

  it('switches to English in the settings, and remembers the choice', async () => {
    render(<App />);
    expect(screen.queryByRole('combobox', { name: 'Idioma' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Definições' })).toHaveAttribute(
      'href',
      '#/definicoes',
    );

    goTo('#/definicoes');
    expect(screen.getByRole('heading', { level: 2, name: 'Definições' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Definições' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('article', { name: 'Localização' })).toHaveTextContent('Coimbra');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Idioma' }), 'en');

    expect(await screen.findByRole('heading', { level: 2, name: 'Settings' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem('lunario.language')).toBe('en');
  });

  it('navigates between Today, the crop list and a crop sheet', async () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Secções' });
    expect(screen.getByRole('link', { name: 'Hoje' })).toHaveAttribute('aria-current', 'page');
    expect(nav).toContainElement(screen.getByRole('link', { name: 'Culturas' }));

    goTo('#/culturas');
    expect(screen.getByRole('heading', { level: 2, name: 'Culturas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Culturas' })).toHaveAttribute('aria-current', 'page');

    goTo('#/cultura/tomate');
    expect(screen.getByRole('heading', { level: 2, name: 'Tomate' })).toBeInTheDocument();
    // Default location is Coimbra, so the calendar is Litoral Centro's.
    expect(
      screen.getByRole('heading', { name: 'Calendário · Litoral Centro' }),
    ).toBeInTheDocument();

    goTo('#/ceu');
    expect(screen.getByRole('heading', { level: 2, name: 'Céu' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Céu' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('article', { name: 'Lua' })).toBeInTheDocument();

    goTo('#/alertas');
    expect(screen.getByRole('heading', { level: 2, name: 'Alertas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Alertas' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('article', { name: 'Geada' })).toBeInTheDocument();

    goTo('#/horta');
    expect(screen.getByRole('heading', { level: 2, name: 'A minha horta' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Horta' })).toHaveAttribute('aria-current', 'page');

    goTo('#/');
    expect(screen.getByRole('heading', { level: 2, name: 'Hoje' })).toBeInTheDocument();
  });
});
