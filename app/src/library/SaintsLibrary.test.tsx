import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { catalog } from '../catalog/catalog.ts';
import { initI18n } from '../i18n/index.ts';
import { SaintsLibrary } from './SaintsLibrary.tsx';

// 11 November 2026, midday in Lisbon: Saint Martin's day.
const SAINT_MARTIN = new Date('2026-11-11T12:00:00Z');

const openMonths = () =>
  Array.from(document.querySelectorAll<HTMLDetailsElement>('details.sayings-month'))
    .filter((d) => d.open)
    .map((d) => d.querySelector('summary span')?.textContent);

describe('SaintsLibrary', () => {
  beforeEach(async () => {
    await initI18n('pt-PT');
  });

  it('lists every saint by month, open on the current one, as a library shelf', () => {
    render(<SaintsLibrary now={SAINT_MARTIN} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Santos' })).toBeInTheDocument();
    expect(
      screen.getByText(`${String(catalog.saints.length + catalog.feasts.length)} santos e festas`),
    ).toBeInTheDocument();
    expect(openMonths()).toEqual(['Novembro']);
    const shelves = screen.getByRole('navigation', { name: 'Secções da biblioteca' });
    expect(within(shelves).getByRole('link', { name: 'Santos' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(shelves).getAllByRole('link')).toHaveLength(5);
  });

  it("marks today's saints, with the day's saying", () => {
    render(<SaintsLibrary now={SAINT_MARTIN} />);
    const today = document.querySelector('.saints-list li.today');
    expect(today).toHaveTextContent('Santos de hoje');
    expect(today).toHaveTextContent(/Martinho/);
    expect(today?.querySelector('blockquote')).toHaveTextContent(/Martinho/);
  });

  it('searches without accents, and filters the popular saints', async () => {
    const user = userEvent.setup();
    render(<SaintsLibrary now={SAINT_MARTIN} />);
    await user.type(screen.getByRole('searchbox', { name: 'Procurar' }), 'antonio');
    expect(openMonths()).toContain('Junho');
    for (const name of document.querySelectorAll('.saint-name')) {
      expect(name).toHaveTextContent(/António/);
    }

    await user.clear(screen.getByRole('searchbox'));
    await user.click(screen.getByRole('button', { name: 'Santos populares' }));
    const popular = catalog.saints.filter((s) => s.origin === 'popular').length;
    expect(screen.getByText(`${String(popular)} santos e festas`)).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox'), 'xyz');
    expect(screen.getByText('Nenhum santo encontrado.')).toBeInTheDocument();
  });

  it('filters the moveable feasts, on their dates for this year (Q-11)', async () => {
    const user = userEvent.setup();
    render(<SaintsLibrary now={SAINT_MARTIN} />);
    await user.click(screen.getByRole('button', { name: 'Festas móveis' }));
    expect(
      screen.getByText(`${String(catalog.feasts.length)} santos e festas`),
    ).toBeInTheDocument();
    // In 2026 they fall between Carnival (17 February) and Corpus Christi (4 June).
    expect(openMonths()).toEqual(['Fevereiro', 'Março', 'Abril', 'Maio', 'Junho']);
    for (const name of document.querySelectorAll('.saint-name')) {
      expect(name).toHaveTextContent(/Festa móvel/);
    }
  });
});
