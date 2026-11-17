import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import { beforeEach, describe, expect, it } from 'vitest';
import { catalog } from '../catalog/catalog.ts';
import { initI18n } from '../i18n/index.ts';
import { SubscribePanel } from './SubscribePanel.tsx';

const LC = catalog.zones.find((z) => z.id === 'LC');
if (!LC) throw new Error('Litoral Centro missing from the catalogue');

describe('SubscribePanel', () => {
  beforeEach(async () => {
    await initI18n('pt-PT');
  });

  it("offers the zone's calendar for Google, other apps and by address", async () => {
    render(<SubscribePanel zone={LC} origin="https://lunario.example" />);
    await userEvent.click(screen.getByRole('button', { name: 'Receber no calendário' }));
    expect(screen.getByRole('dialog', { name: 'Receber no calendário' })).toBeVisible();
    expect(screen.getByText(/o que semear, plantar e colher em Litoral Centro/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Subscrever no Google Calendar' })).toHaveAttribute(
      'href',
      'https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Flunario.example%2Fcalendarios%2Fzona-lc.ics',
    );
    expect(
      screen.getByRole('link', { name: 'Outro calendário (iPhone, Outlook…)' }),
    ).toHaveAttribute('href', 'webcal://lunario.example/calendarios/zona-lc.ics');
    expect(screen.getByText('https://lunario.example/calendarios/zona-lc.ics')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('links the English calendar when the app is in English', async () => {
    render(<SubscribePanel zone={LC} />);
    await act(() => i18n.changeLanguage('en'));
    await userEvent.click(screen.getByRole('button', { name: 'Get it in your calendar' }));
    expect(screen.getByRole('link', { name: 'Other calendar (iPhone, Outlook…)' })).toHaveAttribute(
      'href',
      `webcal://${window.location.host}/calendarios/zona-lc.en.ics`,
    );
  });
});
