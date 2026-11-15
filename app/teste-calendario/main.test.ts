import { fireEvent, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
// Smoke test: load the real page markup, run its script, and check the wiring.
import html from './index.html?raw';

function el<T extends HTMLElement = HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}

describe('calendar test page', () => {
  const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue();

  beforeAll(async () => {
    document.body.innerHTML = /<body>([\s\S]*)<\/body>/.exec(html)?.[1] ?? '';
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await import('./main.ts');
  });

  it('fills in the event dates and the Google links', () => {
    expect(document.getElementById('event-date')?.textContent).not.toBe('');
    expect(document.getElementById('reminder-date')?.textContent).toMatch(/às 13:00$/);

    const add = new URL(el<HTMLAnchorElement>('#google-add').href);
    expect(add.searchParams.get('action')).toBe('TEMPLATE');

    const webcal = el<HTMLAnchorElement>('#webcal').href;
    expect(webcal).toMatch(/^webcal:\/\/.+\/teste-calendario\/zona-teste\.ics$/);
    const subscribe = new URL(el<HTMLAnchorElement>('#google-subscribe').href);
    expect(subscribe.searchParams.get('cid')).toBe(webcal);
  });

  it('adds a result picker to every test', () => {
    for (const test of document.querySelectorAll<HTMLElement>('.test')) {
      expect(within(test).getAllByRole('radio')).toHaveLength(4);
    }
  });

  it('disables file sharing where the browser cannot share files', () => {
    expect(screen.getByRole('button', { name: /A2/ })).toBeDisabled();
  });

  it('copies a readable summary of the answers', async () => {
    fireEvent.change(el('#calendar-app'), { target: { value: 'Google Calendar' } });
    const a1 = el('[data-test="A1"]');
    fireEvent.click(within(a1).getByLabelText('Não funcionou'));
    fireEvent.click(screen.getByRole('button', { name: 'Copiar resultados' }));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());

    const text = writeText.mock.calls.at(-1)?.[0] ?? '';
    expect(text).toContain('Calendário: Google Calendar');
    expect(text).toContain('A1 Descarregar o evento: Não funcionou');
    expect(text).toContain('B1 Subscrever com um toque: —');
    expect(screen.getByRole('status')).toHaveTextContent('Resultados copiados');
  });

  it('copies the feed address', async () => {
    fireEvent.click(screen.getByRole('button', { name: /B3/ }));
    await vi.waitFor(() =>
      expect(writeText).toHaveBeenLastCalledWith(
        expect.stringMatching(/^https?:\/\/.+\/teste-calendario\/zona-teste\.ics$/),
      ),
    );
  });
});
