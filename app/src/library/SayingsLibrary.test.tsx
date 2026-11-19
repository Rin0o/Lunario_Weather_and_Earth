import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import { beforeEach, describe, expect, it } from 'vitest';
import { catalog } from '../catalog/catalog.ts';
import { initI18n } from '../i18n/index.ts';
import { SayingsLibrary } from './SayingsLibrary.tsx';

// 11 November 2026, midday in Lisbon: Saint Martin's day.
const SAINT_MARTIN = new Date('2026-11-11T12:00:00Z');
// The moveable feasts' sayings are listed on their date of the year too (Q-11).
const feastSayings = catalog.feasts.reduce((n, f) => n + f.sayings.length, 0);

const months = () =>
  Array.from(document.querySelectorAll<HTMLDetailsElement>('details.sayings-month'));
const openMonths = () =>
  months()
    .filter((d) => d.open)
    .map((d) => d.querySelector('summary span')?.textContent);

describe('SayingsLibrary', () => {
  beforeEach(async () => {
    await initI18n('pt-PT');
  });

  it('lists every saying by month, open on the current one, with the sources credited', () => {
    render(<SayingsLibrary now={SAINT_MARTIN} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Ditados' })).toBeInTheDocument();
    expect(
      screen.getByText(`${String(catalog.sayings.length + feastSayings)} ditados`),
    ).toBeInTheDocument();
    expect(months()).toHaveLength(12);
    expect(openMonths()).toEqual(['Novembro']);
    // From this month round the year: the open month comes first.
    const names = months().map((d) => d.querySelector('summary span')?.textContent);
    expect(names.slice(0, 3)).toEqual(['Novembro', 'Dezembro', 'Janeiro']);
    expect(names.at(-1)).toBe('Outubro');
    expect(screen.getByRole('link', { name: 'CC BY-SA 4.0' })).toBeInTheDocument();
    const shelves = screen.getByRole('navigation', { name: 'Secções da biblioteca' });
    expect(within(shelves).getByRole('link', { name: 'Ditados' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it("marks today's saying, with its day and themes", () => {
    render(<SayingsLibrary now={SAINT_MARTIN} />);
    const today = document.querySelector('.sayings-list li.today');
    expect(today).toHaveTextContent('Ditado de hoje');
    expect(today?.querySelector('blockquote')).toHaveTextContent(/S\. Martinho/);
    expect(today?.querySelector('.saying-meta')).toHaveTextContent(/^11 de novembro — /);
  });

  it('searches without accents and opens every month found', async () => {
    const user = userEvent.setup();
    render(<SayingsLibrary now={SAINT_MARTIN} />);
    await user.type(screen.getByRole('searchbox', { name: 'Procurar' }), 'sao joao');
    expect(openMonths()).toEqual(['Dezembro', 'Março', 'Abril', 'Junho']);
    for (const quote of screen.getAllByRole('blockquote')) {
      expect(quote).toHaveTextContent(/S(ão|\.) João/);
    }

    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'xyz');
    expect(screen.getByText('Nenhum ditado encontrado.')).toBeInTheDocument();
    expect(months()).toHaveLength(0);
  });

  it('filters by theme, one at a time', async () => {
    const user = userEvent.setup();
    render(<SayingsLibrary now={SAINT_MARTIN} />);
    const themes = screen.getByRole('group', { name: 'Temas' });
    const all = within(themes).getByRole('button', { name: 'Todos' });
    const vines = within(themes).getByRole('button', { name: 'Vinha e vinho' });
    expect(all).toHaveAttribute('aria-pressed', 'true');

    await user.click(vines);
    expect(vines).toHaveAttribute('aria-pressed', 'true');
    expect(all).toHaveAttribute('aria-pressed', 'false');
    const expected = catalog.sayings.filter((s) => s.themes.includes('vinha')).length;
    expect(screen.getAllByRole('blockquote')).toHaveLength(expected);

    await user.click(all);
    expect(openMonths()).toEqual(['Novembro']);
  });

  it('adds the meaning in English, keeping the saying in Portuguese', async () => {
    render(<SayingsLibrary now={SAINT_MARTIN} />);
    await act(() => i18n.changeLanguage('en'));
    expect(screen.getByRole('heading', { level: 2, name: 'Sayings' })).toBeInTheDocument();
    const today = document.querySelector('.sayings-list li.today');
    expect(today?.querySelector('blockquote')).toHaveAttribute('lang', 'pt-PT');
    expect(today?.querySelector('figcaption')).toHaveTextContent(/Saint Martin's day/);
    expect(today?.querySelector('.saying-meta')).toHaveTextContent(/^11 November — /);
  });
});
