import { IDBFactory } from 'fake-indexeddb';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initI18n } from '../i18n/index.ts';
import { GardenPage } from './GardenPage.tsx';

const NOV_16 = new Date('2026-11-16T10:00:00Z');

/** Opens the "Adicionar à horta" window, unless it is already open. */
async function openForm() {
  if (screen.queryByRole('dialog')) return;
  await userEvent.setup().click(screen.getByRole('button', { name: 'Adicionar à horta' }));
}

async function logPlanting(crop: string, action?: string, date?: string) {
  const user = userEvent.setup();
  await openForm();
  await user.selectOptions(screen.getByRole('combobox', { name: 'Cultura' }), crop);
  if (action) await user.selectOptions(screen.getByRole('combobox', { name: 'O que fez' }), action);
  if (date) {
    const input = screen.getByLabelText('Data');
    await user.clear(input);
    await user.type(input, date);
  }
  await user.click(screen.getByRole('button', { name: 'Guardar' }));
}

/** The planting cards (direct children only: each card has its own list of reminders). */
const entries = () => Array.from(document.querySelectorAll<HTMLElement>('ul.plantings > li'));

describe('GardenPage', () => {
  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    await initI18n('pt-PT');
  });

  it('logs a planting and shows its expected harvest', async () => {
    render(<GardenPage now={NOV_16} district="Coimbra" />);
    expect(await screen.findByText('Ainda não tem nada na horta.')).toBeInTheDocument();
    await openForm();
    expect(screen.getByLabelText('Data')).toHaveValue('2026-11-16');

    await logPlanting('Fava');
    expect(await screen.findByText('Registado.')).toBeInTheDocument();

    const [fava] = entries();
    expect(fava).toHaveTextContent('Fava');
    expect(fava).toHaveTextContent('A crescer');
    // Short dates on the card, the full ones in the tooltip. Broad beans: 120–150 days.
    expect(fava).toHaveTextContent('16/11');
    expect(fava).toHaveTextContent('16/03 – 15/04');
    expect(
      within(fava as HTMLElement).getByTitle('Semeado · 16 de novembro de 2026'),
    ).toBeVisible();
    expect(
      within(fava as HTMLElement).getByTitle(
        'Colheita prevista: 16 de março de 2027 – 15 de abril de 2027.',
      ),
    ).toBeVisible();
    expect(within(fava as HTMLElement).getByRole('link', { name: 'Fava' })).toHaveAttribute(
      'href',
      '#/cultura/fava',
    );
  });

  it("offers only the crop's actions and flags out-of-season entries", async () => {
    const user = userEvent.setup();
    render(<GardenPage now={NOV_16} district="Coimbra" />);
    await screen.findByText('Ainda não tem nada na horta.');
    await openForm();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Cultura' }), 'Tomate');
    const actions = within(screen.getByRole('combobox', { name: 'O que fez' }))
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(actions).toEqual(['Semear em viveiro', 'Transplantar']);
    expect(screen.getByRole('note')).toHaveTextContent(
      'Fora da época recomendada para semear em viveiro em Litoral Centro.',
    );

    await user.selectOptions(screen.getByRole('combobox', { name: 'Cultura' }), 'Fava');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('marks a planting as harvested and back, and deletes after confirmation', async () => {
    const user = userEvent.setup();
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<GardenPage now={NOV_16} district="Coimbra" confirm={confirm} />);
    await screen.findByText('Ainda não tem nada na horta.');
    await logPlanting('Alho');
    await screen.findByText('Registado.');

    await user.click(screen.getByRole('button', { name: 'Marcar como colhido' }));
    expect(await screen.findByText('Colhido')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar a ativo' }));
    expect(await screen.findByText('A crescer')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Apagar' }));
    expect(confirm).toHaveBeenLastCalledWith('Apagar o registo de Alho de 16 de novembro de 2026?');
    expect(entries()).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Apagar' }));
    expect(await screen.findByText('Ainda não tem nada na horta.')).toBeInTheDocument();
  });

  it('handles perennials, transplants and keeps entries after a reload', async () => {
    const { unmount } = render(<GardenPage now={NOV_16} district="Coimbra" />);
    await screen.findByText('Ainda não tem nada na horta.');
    await logPlanting('Morango');
    await screen.findByText('Registado.');
    await logPlanting('Couve-galega', 'Transplantar', '2026-11-01');
    await waitFor(() => expect(entries()).toHaveLength(2));
    unmount();

    render(<GardenPage now={NOV_16} district="Coimbra" />);
    await waitFor(() => expect(entries()).toHaveLength(2));
    const [strawberry, kale] = entries();
    expect(strawberry).toHaveTextContent('Perene');
    expect(strawberry).toHaveTextContent('Na época própria');
    expect(
      within(kale as HTMLElement).getByTitle('Transplantado · 1 de novembro de 2026'),
    ).toBeVisible();
    expect(within(kale as HTMLElement).getByTitle(/Contado a partir do transplante/)).toBeVisible();
  });

  it('opens the form in a window, keeps it open after a save and closes it', async () => {
    const user = userEvent.setup();
    render(<GardenPage now={NOV_16} district="Coimbra" />);
    await screen.findByText('Ainda não tem nada na horta.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await logPlanting('Fava');
    await screen.findByText('Registado.');
    // Still open, to log the next one.
    expect(screen.getByRole('dialog', { name: 'Adicionar à horta' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Cultura' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(entries()).toHaveLength(1);
  });

  it('switches to English', async () => {
    render(<GardenPage now={NOV_16} district="Coimbra" />);
    await screen.findByText('Ainda não tem nada na horta.');
    await logPlanting('Fava');
    await screen.findByText('Registado.');
    await act(() => i18n.changeLanguage('en'));
    expect(screen.getByRole('heading', { name: 'My garden' })).toBeInTheDocument();
    expect(entries()[0]).toHaveTextContent('Broad bean');
    expect(within(entries()[0] as HTMLElement).getByTitle('Sown · 16 November 2026')).toBeVisible();
  });
});
