import { IDBFactory } from 'fake-indexeddb';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from 'i18next';
import type { Location } from '../astro/location.ts';
import { getMeta } from '../garden/db.ts';
import { initI18n } from '../i18n/index.ts';
import { Today } from './Today.tsx';

const LISBON: Location = { name: 'Lisboa', latitude: 38.7223, longitude: -9.1393 };
// Full moon at 22:27 UTC (22:27 in Lisbon, winter time). USNO reference.
const FULL_MOON_DAY = new Date('2025-01-13T12:00:00Z');
// Summer: Lisbon is UTC+1, so the USNO sunrise of 05:12 UTC shows as 06:12.
const SOLSTICE = new Date('2025-06-21T12:00:00Z');

const fact = (term: string) => {
  const dt = screen.getAllByText(term, { selector: 'dt' })[0];
  return dt?.nextElementSibling?.textContent;
};

describe('Today', () => {
  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    await initI18n('pt-PT');
  });

  it('keeps the Moon mode off by default, and shows the tradition once turned on', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Today now={FULL_MOON_DAY} location={LISBON} />);
    const toggle = screen.getByRole('checkbox', { name: 'Mostrar a tradição lunar (modo Lua)' });
    expect(toggle).not.toBeChecked();
    expect(screen.queryByText(/Tradição lunar/)).not.toBeInTheDocument();

    await user.click(toggle);
    expect(
      screen.getByRole('heading', { name: 'Tradição lunar · período de lua cheia' }),
    ).toBeInTheDocument();
    // 13 January 2025 is the exact day of the full moon.
    expect(
      screen.getByText('Hoje é dia de lua cheia. Evitar semear, plantar e transplantar.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Colher para consumo imediato/)).toBeInTheDocument();
    expect(screen.getByText(/^Tradição popular, sem suporte científico/)).toBeInTheDocument();

    // The choice is saved on the device.
    await waitFor(async () => expect(await getMeta('moonMode')).toBe('on'));
    unmount();
    render(<Today now={FULL_MOON_DAY} location={LISBON} />);
    expect(
      await screen.findByRole('checkbox', {
        name: 'Mostrar a tradição lunar (modo Lua)',
        checked: true,
      }),
    ).toBeInTheDocument();
  });

  it('shows the moon phase of the day with its exact time', () => {
    render(<Today now={FULL_MOON_DAY} location={LISBON} />);
    const moon = screen.getByRole('article', { name: 'Lua' });
    expect(within(moon).getByText('Lua cheia', { selector: 'strong' })).toBeInTheDocument();
    // USNO prints 22:27; the computed instant is 22:27:32, which we round to 22:28.
    expect(moon.querySelector('.moon-phase')?.textContent).toMatch(/às 22:2[78]$/);
    expect(screen.getByText(/segunda-feira, 13 de janeiro/i)).toBeInTheDocument();
  });

  it('lists the next four principal phases', () => {
    render(<Today now={FULL_MOON_DAY} location={LISBON} />);
    const moon = screen.getByRole('article', { name: 'Lua' });
    const items = within(within(moon).getByRole('list')).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining('Lua cheia'),
      expect.stringContaining('Quarto minguante'),
      expect.stringContaining('Lua nova'),
      expect.stringContaining('Quarto crescente'),
    ]);
  });

  it('shows sunrise, sunset and day length in Portuguese local time', () => {
    render(<Today now={SOLSTICE} location={LISBON} />);
    expect(fact('Nascer do sol')).toBe('06:12');
    expect(fact('Pôr do sol')).toBe('21:05');
    expect(fact('Duração do dia')).toMatch(/^14 h 5[23] min$/);
    expect(screen.getByText('Horas para Lisboa')).toBeInTheDocument();
  });

  it('switches to English', async () => {
    render(<Today now={SOLSTICE} location={LISBON} />);
    await act(() => i18n.changeLanguage('en'));
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument();
    expect(fact('Sunrise')).toBe('06:12');
    expect(screen.getByText(/Saturday 21 June/)).toBeInTheDocument();
  });

  it('says when the Moon does not rise or set on a given day', () => {
    // USNO, Lisbon: no moonrise on 2025-01-20 (sets 11:07); no moonset on 2025-01-06 (rises 11:52).
    const { unmount } = render(<Today now={new Date('2025-01-20T12:00:00Z')} location={LISBON} />);
    expect(fact('Nasce')).toBe('não nasce hoje');
    expect(fact('Põe-se')).toBe('11:07');
    unmount();

    render(<Today now={new Date('2025-01-06T12:00:00Z')} location={LISBON} />);
    expect(fact('Nasce')).toBe('11:52');
    expect(fact('Põe-se')).toBe('não se põe hoje');
  });
});
