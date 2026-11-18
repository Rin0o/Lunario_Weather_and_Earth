import { act, render, screen, within } from '@testing-library/react';
import i18n from 'i18next';
import { beforeEach, describe, expect, it } from 'vitest';
import { catalog } from '../catalog/catalog.ts';
import { initI18n } from '../i18n/index.ts';
import { SowingCard } from './SowingCard.tsx';

const NOV_15 = new Date('2026-11-15T10:00:00Z');

const group = (heading: string) =>
  within(screen.getByRole('region', { name: heading }))
    .getAllByRole('listitem')
    .map((li) => li.textContent);

describe('SowingCard', () => {
  beforeEach(async () => {
    await initI18n('pt-PT');
  });

  it("shows this fortnight's work for the user's zone", () => {
    render(<SowingCard now={NOV_15} district="Coimbra" />);
    expect(screen.getByRole('heading', { name: 'Esta quinzena' })).toBeInTheDocument();
    expect(screen.getByText('1–15 de novembro · Litoral Centro')).toBeInTheDocument();
    expect(group('Semear em viveiro')).toEqual(['Cebola']);
    expect(group('Semear diretamente')).toEqual([
      'Ervilha',
      'Espinafreúltima quinzena',
      'Fava',
      'Nabo / nabiça / grelos',
    ]);
    // Onion sets carry a note, shown as a mark.
    expect(group('Plantar')).toEqual(['Alho', 'Cebola*', 'Morango']);
    expect(screen.getByRole('region', { name: 'Colher' })).toBeInTheDocument();
  });

  it('marks crops with a zone note and explains the mark', () => {
    render(<SowingCard now={new Date('2026-06-05T10:00:00Z')} district="Guarda" />);
    expect(screen.getByText('1–15 de junho · Interior')).toBeInTheDocument();
    const melonLink = within(screen.getByRole('region', { name: 'Semear diretamente' })).getByRole(
      'link',
      { name: 'Melão' },
    );
    expect(melonLink).toHaveAttribute('href', '#/cultura/melao');
    const chip = melonLink.closest('li') as HTMLElement;
    expect(within(chip).getByLabelText(/^Marginal no interior/)).toHaveTextContent('*');
    expect(
      screen.getByText('* Marginal no interior: só com estufa/túnel ou variedade precoce'),
    ).toBeInTheDocument();
  });

  it('says when there is nothing to do', () => {
    render(<SowingCard now={NOV_15} district="Coimbra" source={{ ...catalog, windows: [] }} />);
    expect(
      screen.getByText('Nada a semear, plantar ou colher nesta quinzena.'),
    ).toBeInTheDocument();
  });

  it('renders nothing for a district outside every zone', () => {
    const { container } = render(<SowingCard now={NOV_15} district="Funchal" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('switches to English, sorting by the English names', async () => {
    render(<SowingCard now={NOV_15} district="Coimbra" />);
    await act(() => i18n.changeLanguage('en'));
    // en-GB puts thin spaces around the dash: "1 – 15 November".
    expect(screen.getByText(/^1\s?–\s?15 November · Central coast$/)).toBeInTheDocument();
    expect(group('Sow directly')).toEqual([
      'Broad bean',
      'Pea',
      'Spinachlast fortnight',
      'Turnip / turnip greens / turnip tops',
    ]);
  });
});
