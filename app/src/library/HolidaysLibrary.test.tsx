import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { initI18n } from '../i18n/index.ts';
import { HolidaysLibrary } from './HolidaysLibrary.tsx';

const items = () => Array.from(document.querySelectorAll<HTMLLIElement>('.holiday-list li'));
const marked = (mark: string) =>
  items()
    .filter((li) => li.dataset.mark === mark)
    .map((li) => li.querySelector('.holiday-name')?.textContent);

describe('HolidaysLibrary', () => {
  beforeEach(async () => {
    await initI18n('pt-PT');
  });

  it("lists the year's holidays, the past ones faded and the next one marked", () => {
    // 18 November 2026: All Saints' Day has gone, the Restoration is next.
    render(<HolidaysLibrary now={new Date('2026-11-18T12:00:00Z')} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Feriados' })).toBeInTheDocument();
    expect(screen.getByText('2026')).toBeInTheDocument();
    expect(items()).toHaveLength(14);
    expect(marked('next')).toEqual(['Restauração da Independência']);
    expect(marked('past')).toHaveLength(11);
    expect(screen.getByText(/Em 2026, a Páscoa é a 5 de abril/)).toBeInTheDocument();
    const carnival = items().find((li) => li.textContent?.includes('Carnaval'));
    expect(carnival).toHaveTextContent('móvel · facultativo');
  });

  it("marks today's holiday", () => {
    render(<HolidaysLibrary now={new Date('2026-12-25T12:00:00Z')} />);
    expect(marked('today')).toEqual(['Natal']);
    expect(screen.getByText('Hoje')).toBeInTheDocument();
  });

  it('goes to other years and back, the moveable feasts moving with Easter', async () => {
    const user = userEvent.setup();
    render(<HolidaysLibrary now={new Date('2026-11-18T12:00:00Z')} />);
    await user.click(screen.getByRole('button', { name: 'Ano seguinte' }));
    expect(screen.getByText('2027')).toBeInTheDocument();
    expect(screen.getByText(/Em 2027, a Páscoa é a 28 de março/)).toBeInTheDocument();
    expect(marked('past')).toHaveLength(0);
    // The next holiday is still 1 December 2026, not the first of 2027.
    expect(marked('next')).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Voltar a 2026' }));
    expect(screen.getByText('2026')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Voltar a 2026' })).not.toBeInTheDocument();
  });
});
