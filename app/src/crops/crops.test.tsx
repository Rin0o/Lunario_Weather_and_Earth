import { IDBFactory } from 'fake-indexeddb';
import { act, render, screen, within } from '@testing-library/react';
import i18n from 'i18next';
import { beforeEach, describe, expect, it } from 'vitest';
import { setMeta } from '../garden/db.ts';
import { initI18n } from '../i18n/index.ts';
import { CropSheet } from './CropSheet.tsx';
import { CropsList } from './CropsList.tsx';

const NOV_15 = new Date('2026-11-15T10:00:00Z');

const fact = (term: string) =>
  screen.getByText(term, { selector: 'dt' }).nextElementSibling?.textContent;

const calendarEntries = () =>
  Array.from(document.querySelectorAll('.calendar-list > div')).map((group) => ({
    action: group.querySelector('dt')?.textContent,
    ranges: Array.from(group.querySelectorAll('dd')).map((dd) => dd.textContent),
  }));

describe('CropsList', () => {
  beforeEach(async () => {
    await initI18n('pt-PT');
  });

  it('lists all 35 crops alphabetically, linking to their sheets', () => {
    render(<CropsList />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(35);
    expect(links[0]).toHaveTextContent(/^AbóboraCucurbita/);
    expect(links[0]).toHaveAttribute('href', '#/cultura/abobora');
    expect(links.at(-1)).toHaveTextContent(/^Tomate/);
  });

  it('sorts by the English names in English', async () => {
    render(<CropsList />);
    await act(() => i18n.changeLanguage('en'));
    expect(screen.getAllByRole('link')[0]).toHaveTextContent(/^Aubergine/);
  });
});

describe('CropSheet', () => {
  beforeEach(async () => {
    await initI18n('pt-PT');
  });

  it("shows a crop's facts and its calendar for the user's zone", () => {
    render(<CropSheet cropId="alface" now={NOV_15} district="Coimbra" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Alface' })).toBeInTheDocument();
    expect(screen.getByText('Lactuca sativa')).toBeInTheDocument();
    expect(fact('Família')).toBe('Asteraceae');
    expect(fact('Parte comestível')).toBe('Folhas');
    expect(fact('Época')).toBe('Estação fresca');
    expect(fact('Ciclo')).toBe('60–90 dias');
    expect(fact('Compasso')).toBe('30×30 cm (linhas × plantas)');
    expect(screen.getByText(/^No verão sobe à flor/)).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { name: 'Calendário · Litoral Centro' }),
    ).toBeInTheDocument();
    expect(calendarEntries()).toEqual([
      { action: 'Semear em viveiro', ranges: ['16 de janeiro – 30 de setembro'] },
      { action: 'Transplantar', ranges: ['1 de março – 31 de outubro'] },
      { action: 'Colher', ranges: ['16 de março – 31 de dezembro · calculada pelo ciclo'] },
    ]);
    // The strip marks the current fortnight (first half of November = 21).
    const now = document.querySelectorAll('.strip-row')[0]?.querySelectorAll('.strip-cell')[20];
    expect(now).toHaveClass('now');
    // Months read as short names, the current one marked.
    const months = [...document.querySelectorAll('.strip-months span')].map((s) => s.textContent);
    expect(months).toEqual([
      'jan',
      'fev',
      'mar',
      'abr',
      'mai',
      'jun',
      'jul',
      'ago',
      'set',
      'out',
      'nov',
      'dez',
    ]);
    expect(document.querySelector('.now-month')).toHaveTextContent('nov');
  });

  it("uses the zone of the user's district, with its notes", () => {
    render(<CropSheet cropId="melao" now={NOV_15} district="Guarda" />);
    expect(screen.getByRole('heading', { name: 'Calendário · Interior' })).toBeInTheDocument();
    expect(screen.getByText(/^Marginal no interior/)).toBeInTheDocument();
  });

  it('shows windows across the new year and perennial crops', () => {
    render(<CropSheet cropId="morango" now={NOV_15} district="Coimbra" />);
    expect(fact('Ciclo')).toBe('Perene (produz 2–3 anos)');
    expect(calendarEntries()).toEqual([
      {
        action: 'Plantar',
        ranges: ['1 de fevereiro – 15 de março', '1 de outubro – 30 de novembro'],
      },
      { action: 'Colher', ranges: ['1 de abril – 30 de junho'] },
    ]);
  });

  it('shows the lunar tradition for the crop only in Moon mode', async () => {
    globalThis.indexedDB = new IDBFactory();
    const { unmount } = render(<CropSheet cropId="alface" now={NOV_15} district="Coimbra" />);
    expect(screen.queryByRole('heading', { name: 'Tradição lunar' })).not.toBeInTheDocument();
    unmount();

    await setMeta('moonMode', 'on');
    render(<CropSheet cropId="alface" now={NOV_15} district="Coimbra" />);
    const card = await screen.findByRole('article', { name: 'Tradição lunar' });
    expect(
      within(card)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual([
      'Semear culturas de folha: quarto crescente',
      'Transplantar: quarto minguante',
      'Colher para conservar (batata, cebola, alho, abóbora): quarto minguante',
      'Colher para consumo imediato: crescente ou cheia',
    ]);
    expect(within(card).getByText(/^Tradição popular/)).toBeInTheDocument();
  });

  it('says when a crop does not exist', () => {
    render(<CropSheet cropId="banana" now={NOV_15} district="Coimbra" />);
    expect(screen.getByText('Esta cultura não existe no calendário.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Todas as culturas' })).toHaveAttribute(
      'href',
      '#/culturas',
    );
  });

  it('switches to English', async () => {
    render(<CropSheet cropId="fava" now={NOV_15} district="Faro" />);
    await act(() => i18n.changeLanguage('en'));
    expect(screen.getByRole('heading', { level: 2, name: 'Broad bean' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Calendar · South' })).toBeInTheDocument();
    const sow = calendarEntries().find((e) => e.action === 'Sow directly');
    expect(sow?.ranges).toEqual(['16 October – 31 January']);
    // Opened directly, the back button leads to the crop list.
    expect(screen.getByRole('link', { name: 'Back to Crops' })).toHaveAttribute(
      'href',
      '#/culturas',
    );
  });
});
