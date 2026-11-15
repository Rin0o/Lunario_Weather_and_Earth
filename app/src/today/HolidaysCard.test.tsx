import { act, render, screen, within } from '@testing-library/react';
import i18n from 'i18next';
import { beforeEach, describe, expect, it } from 'vitest';
import { initI18n } from '../i18n/index.ts';
import { HolidaysCard } from './HolidaysCard.tsx';

const items = () =>
  within(screen.getByRole('list'))
    .getAllByRole('listitem')
    .map((li) => li.textContent);

describe('HolidaysCard', () => {
  beforeEach(async () => {
    await initI18n('pt-PT');
  });

  it('lists the next three holidays with how far away they are', () => {
    render(<HolidaysCard now={new Date('2026-11-15T12:00:00Z')} />);
    expect(screen.queryByText(/Hoje é feriado/)).not.toBeInTheDocument();
    expect(items()).toEqual([
      expect.stringMatching(/^Restauração da Independência.*1\/12 · dentro de 16 dias$/),
      expect.stringMatching(/^Imaculada Conceição.*8\/12 · dentro de 23 dias$/),
      expect.stringMatching(/^Natal.*25\/12 · dentro de 40 dias$/),
    ]);
  });

  it('announces a holiday on the day itself', () => {
    render(<HolidaysCard now={new Date('2026-04-05T12:00:00Z')} />);
    expect(screen.getByText('Hoje é feriado: Domingo de Páscoa')).toBeInTheDocument();
    expect(items()[0]).toMatch(/^Dia da Liberdade/);
  });

  it('says "amanhã" for a holiday on the next day', () => {
    render(<HolidaysCard now={new Date('2026-04-04T12:00:00Z')} />);
    expect(screen.queryByText(/Hoje é feriado/)).not.toBeInTheDocument();
    expect(items()[0]).toMatch(/^Domingo de Páscoa.*amanhã$/);
  });

  it('marks Carnival as optional', () => {
    render(<HolidaysCard now={new Date('2027-01-05T12:00:00Z')} />);
    expect(items()[0]).toMatch(/^Carnaval \(facultativo\)/);
  });

  it('uses the Portuguese date, not UTC, near midnight', () => {
    // 23:30 UTC on 24 April 2026 is already 25 April (Freedom Day) in Lisbon (UTC+1).
    render(<HolidaysCard now={new Date('2026-04-24T23:30:00Z')} />);
    expect(screen.getByText('Hoje é feriado: Dia da Liberdade')).toBeInTheDocument();
  });

  it('switches to English', async () => {
    render(<HolidaysCard now={new Date('2026-12-24T12:00:00Z')} />);
    await act(() => i18n.changeLanguage('en'));
    expect(screen.getByRole('heading', { name: 'Upcoming holidays' })).toBeInTheDocument();
    expect(items()[0]).toMatch(/^Christmas Day.*tomorrow$/);
  });
});
