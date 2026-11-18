import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { initI18n } from '../i18n/index.ts';
import { MoonLibrary } from './MoonLibrary.tsx';

const items = () => Array.from(document.querySelectorAll<HTMLLIElement>('.moon-phase-list li'));
const marked = (mark: string) => items().filter((li) => li.dataset.mark === mark);

describe('MoonLibrary', () => {
  beforeEach(async () => {
    await initI18n('pt-PT');
  });

  it("lists the year's phases by month, the past faded and the next marked", () => {
    render(<MoonLibrary now={new Date('2026-11-18T12:00:00Z')} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Fases da Lua' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(12);
    expect(screen.getByText(/13 luas cheias · 1 lua azul · 2 eclipses da Lua/)).toBeInTheDocument();
    // After the new moon of 9 November 2026, the next phase is the first quarter on the 17th…
    // or later: whichever it is, exactly one is marked and everything before it is past.
    const next = marked('next');
    expect(next).toHaveLength(1);
    expect(next[0]).toHaveTextContent('A próxima');
    expect(items().findIndex((li) => li.dataset.mark === 'next')).toBe(
      marked('past').length + marked('today').length,
    );
    expect(screen.getByText(/lua azul$/)).toBeInTheDocument();
    expect(screen.getByText(/eclipse total da Lua/)).toBeInTheDocument();
  });

  it('goes to other years and back', async () => {
    const user = userEvent.setup();
    render(<MoonLibrary now={new Date('2026-11-18T12:00:00Z')} />);
    await user.click(screen.getByRole('button', { name: 'Ano seguinte' }));
    expect(screen.getByText('2027')).toBeInTheDocument();
    expect(marked('past')).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Voltar a 2026' }));
    expect(screen.getByText('2026')).toBeInTheDocument();
  });
});
