import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { initI18n } from '../i18n/index.ts';
import { SeasonsCard } from './SeasonsCard.tsx';

const LISBOA = { name: 'Lisboa', latitude: 38.7167, longitude: -9.1333 };

describe('SeasonsCard', () => {
  beforeEach(async () => {
    await initI18n('pt-PT');
  });

  it('shows the season, the next solstice with its day length, and the year', () => {
    render(<SeasonsCard now={new Date('2026-11-18T10:00:00Z')} location={LISBOA} />);
    const card = screen.getByRole('article', { name: 'Estações' });
    expect(within(card).getByText('Outono')).toBeInTheDocument();
    expect(within(card).getByText(/desde 23 de setembro/)).toBeInTheDocument();
    expect(within(card).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '63');
    expect(within(card).getByRole('heading', { name: 'Solstício de inverno' })).toBeInTheDocument();
    expect(within(card).getByText(/segunda-feira, 21 de dezembro, 20:50/)).toBeInTheDocument();
    expect(within(card).getByText('dentro de 33 dias')).toBeInTheDocument();
    expect(
      within(card).getByText(/O dia mais curto do ano: 9 h \d+ min de sol/),
    ).toBeInTheDocument();
    expect(within(card).getByText(/^\(\d+ min menos do que hoje\)$/)).toBeInTheDocument();
    const year = within(card).getAllByRole('listitem');
    expect(year).toHaveLength(4);
    expect(year.map((li) => li.querySelector('strong')?.textContent)).toEqual([
      'Equinócio da primavera',
      'Solstício de verão',
      'Equinócio do outono',
      'Solstício de inverno',
    ]);
    expect(year[0]).toHaveAttribute('data-past');
    expect(year[1]).toHaveAttribute('data-past');
    // The September equinox began the current season; the December solstice is next.
    expect(year[2]).toHaveAttribute('data-mark', 'current');
    expect(year[2]).toHaveTextContent('início do outono · atual');
    expect(year[2]).toHaveTextContent('quarta, 23/09, 01:06');
    expect(year[3]).toHaveAttribute('data-mark', 'next');
    expect(year[3]).toHaveTextContent('início do inverno · o próximo');
  });

  it('in January, lists last year’s December solstice first, as the current one', () => {
    render(<SeasonsCard now={new Date('2027-01-10T12:00:00Z')} location={LISBOA} />);
    expect(screen.getByRole('heading', { name: 'Em 2027' })).toBeInTheDocument();
    const year = screen.getAllByRole('listitem');
    expect(year).toHaveLength(5);
    expect(year[0]).toHaveAttribute('data-mark', 'current');
    expect(year[0]).toHaveTextContent('Solstício de inverno');
    expect(year[0]).toHaveTextContent('segunda, 21/12/2026, 20:50');
    expect(year[1]).toHaveAttribute('data-mark', 'next');
    expect(year[1]).toHaveTextContent('sábado, 20/03, 20:25');
    expect(year.filter((li) => li.hasAttribute('data-past'))).toHaveLength(0);
  });

  it('says "hoje" on the day of the event', () => {
    render(<SeasonsCard now={new Date('2026-06-21T06:00:00Z')} location={LISBOA} />);
    expect(screen.getByRole('heading', { name: 'Solstício de verão' })).toBeInTheDocument();
    expect(screen.getByText('hoje')).toBeInTheDocument();
    expect(screen.getByText(/O dia mais longo do ano: 14 h \d+ min de sol/)).toBeInTheDocument();
  });
});
