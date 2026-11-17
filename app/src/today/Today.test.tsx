import { IDBFactory } from 'fake-indexeddb';
import { act, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from 'i18next';
import type { Location } from '../astro/location.ts';
import { initI18n } from '../i18n/index.ts';
import { Today } from './Today.tsx';

const LISBON: Location = { name: 'Lisboa', latitude: 38.7223, longitude: -9.1393 };
// Full moon at 22:27 UTC (USNO).
const FULL_MOON_DAY = new Date('2025-01-13T12:00:00Z');
// Summer: Lisbon is UTC+1, so the USNO sunrise of 05:12 UTC shows as 06:12.
const SOLSTICE = new Date('2025-06-21T12:00:00Z');
const CHRISTMAS = new Date('2025-12-25T12:00:00Z');

const fact = (term: string) => {
  const dt = screen.getAllByText(term, { selector: 'dt' })[0];
  return dt?.nextElementSibling?.textContent;
};

describe('Today', () => {
  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    await initI18n('pt-PT');
  });

  it('sums up the Moon and the Sun, with a link to the Sky page', () => {
    render(<Today now={FULL_MOON_DAY} location={LISBON} />);
    const summary = screen.getByRole('article', { name: 'Lua e sol' });
    expect(within(summary).getByText('Lua cheia', { selector: 'strong' })).toBeInTheDocument();
    expect(within(summary).getByText(/Iluminação 100\s?%/)).toBeInTheDocument();
    expect(within(summary).getByRole('link', { name: 'Lua, sol e feriados' })).toHaveAttribute(
      'href',
      '#/ceu',
    );
    expect(screen.getByText(/segunda-feira, 13 de janeiro/i)).toBeInTheDocument();
  });

  it('shows sunrise and sunset in Portuguese local time', () => {
    render(<Today now={SOLSTICE} location={LISBON} />);
    expect(fact('Nascer do sol')).toBe('06:12');
    expect(fact('Pôr do sol')).toBe('21:05');
    expect(screen.getByText('Horas para Lisboa')).toBeInTheDocument();
  });

  it('says when today is a holiday', () => {
    const { unmount } = render(<Today now={CHRISTMAS} location={LISBON} />);
    expect(screen.getByText('Hoje é feriado: Natal')).toBeInTheDocument();
    unmount();
    render(<Today now={SOLSTICE} location={LISBON} />);
    expect(screen.queryByText(/Hoje é feriado/)).not.toBeInTheDocument();
  });

  it('switches to English', async () => {
    render(<Today now={SOLSTICE} location={LISBON} />);
    await act(() => i18n.changeLanguage('en'));
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument();
    expect(fact('Sunrise')).toBe('06:12');
    expect(screen.getByText(/Saturday 21 June/)).toBeInTheDocument();
  });
});
