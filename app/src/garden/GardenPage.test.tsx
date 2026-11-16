import { IDBFactory } from 'fake-indexeddb';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initI18n } from '../i18n/index.ts';
import { GardenPage } from './GardenPage.tsx';

const NOV_16 = new Date('2026-11-16T10:00:00Z');

async function logPlanting(crop: string, action?: string, date?: string) {
  const user = userEvent.setup();
  await user.selectOptions(screen.getByRole('combobox', { name: 'Cultura' }), crop);
  if (action) await user.selectOptions(screen.getByRole('combobox', { name: 'O que fez' }), action);
  if (date) {
    const input = screen.getByLabelText('Data');
    await user.clear(input);
    await user.type(input, date);
  }
  await user.click(screen.getByRole('button', { name: 'Guardar' }));
}

const entries = () => within(screen.getByRole('list')).getAllByRole('listitem');

describe('GardenPage', () => {
  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    await initI18n('pt-PT');
  });

  it('logs a planting and shows its expected harvest', async () => {
    render(<GardenPage now={NOV_16} district="Coimbra" />);
    expect(await screen.findByText('Ainda não registou nenhum plantio.')).toBeInTheDocument();
    expect(screen.getByLabelText('Data')).toHaveValue('2026-11-16');

    await logPlanting('Fava');
    expect(await screen.findByText('Registado.')).toBeInTheDocument();

    const [fava] = entries();
    expect(fava).toHaveTextContent('Fava');
    expect(fava).toHaveTextContent('A crescer');
    expect(fava).toHaveTextContent('Semeado · 16 de novembro de 2026');
    // Broad beans: 120–150 days.
    expect(fava).toHaveTextContent('Colheita prevista: 16 de março de 2027 – 15 de abril de 2027.');
    expect(within(fava as HTMLElement).getByRole('link', { name: 'Fava' })).toHaveAttribute(
      'href',
      '#/cultura/fava',
    );
  });

  it("offers only the crop's actions and flags out-of-season entries", async () => {
    const user = userEvent.setup();
    render(<GardenPage now={NOV_16} district="Coimbra" />);
    await screen.findByText('Ainda não registou nenhum plantio.');

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
    await screen.findByText('Ainda não registou nenhum plantio.');
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
    expect(await screen.findByText('Ainda não registou nenhum plantio.')).toBeInTheDocument();
  });

  it('handles perennials, transplants and keeps entries after a reload', async () => {
    const { unmount } = render(<GardenPage now={NOV_16} district="Coimbra" />);
    await screen.findByText('Ainda não registou nenhum plantio.');
    await logPlanting('Morango');
    await screen.findByText('Registado.');
    await logPlanting('Couve-galega', 'Transplantar', '2026-11-01');
    await waitFor(() => expect(entries()).toHaveLength(2));
    unmount();

    render(<GardenPage now={NOV_16} district="Coimbra" />);
    await waitFor(() => expect(entries()).toHaveLength(2));
    const [strawberry, kale] = entries();
    expect(strawberry).toHaveTextContent('Perene');
    expect(strawberry).toHaveTextContent('Cultura perene: colhe-se na época própria.');
    expect(kale).toHaveTextContent('Transplantado · 1 de novembro de 2026');
    expect(kale).toHaveTextContent('Contado a partir do transplante');
  });

  it('switches to English', async () => {
    render(<GardenPage now={NOV_16} district="Coimbra" />);
    await screen.findByText('Ainda não registou nenhum plantio.');
    await logPlanting('Fava');
    await screen.findByText('Registado.');
    await act(() => i18n.changeLanguage('en'));
    expect(screen.getByRole('heading', { name: 'My garden' })).toBeInTheDocument();
    expect(entries()[0]).toHaveTextContent('Broad bean');
    expect(entries()[0]).toHaveTextContent('Sown · 16 November 2026');
  });
});
