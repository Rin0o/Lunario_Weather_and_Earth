import { act, render, screen, within } from '@testing-library/react';
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

  it('opens the About page from the settings, with the credits', () => {
    render(<App />);
    goTo('#/definicoes');
    expect(screen.getByRole('link', { name: /Ver créditos/ })).toHaveAttribute('href', '#/sobre');

    goTo('#/sobre');
    expect(screen.getByRole('heading', { level: 2, name: 'Sobre' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar a Definições' })).toHaveAttribute(
      'href',
      '#/definicoes',
    );
    for (const group of ['Gravuras', 'Dados', 'Ícones e letra']) {
      expect(screen.getByRole('article', { name: group })).toBeInTheDocument();
    }
    expect(screen.getByRole('article', { name: 'Gravuras' })).toHaveTextContent(
      'Les Plantes potagères',
    );
    expect(screen.getByRole('link', { name: 'IPMA' })).toHaveAttribute(
      'href',
      'https://api.ipma.pt',
    );
  });

  it('navigates between Today, the library and a crop sheet', async () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Secções' });
    const library = within(nav).getByRole('link', { name: 'Biblioteca' });
    expect(screen.getByRole('link', { name: 'Hoje' })).toHaveAttribute('aria-current', 'page');
    expect(library).toHaveAttribute('href', '#/culturas');

    goTo('#/biblioteca');
    expect(screen.getByRole('heading', { level: 2, name: 'Culturas' })).toBeInTheDocument();
    expect(library).toHaveAttribute('aria-current', 'page');
    const shelves = screen.getByRole('navigation', { name: 'Secções da biblioteca' });
    expect(within(shelves).getByRole('link', { name: 'Culturas' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    goTo('#/ditados');
    expect(screen.getByRole('heading', { level: 2, name: 'Ditados' })).toBeInTheDocument();
    expect(library).toHaveAttribute('aria-current', 'page');

    goTo('#/culturas');

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
    // Opened from Céu, the back button leads there.
    expect(screen.getByRole('link', { name: 'Voltar a Céu' })).toBeInTheDocument();

    goTo('#/horta');
    expect(screen.getByRole('heading', { level: 2, name: 'A minha horta' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Horta' })).toHaveAttribute('aria-current', 'page');

    goTo('#/');
    expect(screen.getByRole('heading', { level: 2, name: 'Hoje' })).toBeInTheDocument();
  });
});
