import { act, render, screen, within } from '@testing-library/react';
import i18n from 'i18next';
import { beforeEach, describe, expect, it } from 'vitest';
import { initI18n } from '../i18n/index.ts';
import { AlmanacCard } from './AlmanacCard.tsx';

// 11 November 2026, midday in Lisbon.
const SAINT_MARTIN = new Date('2026-11-11T12:00:00Z');

describe('AlmanacCard', () => {
  beforeEach(async () => {
    await initI18n('pt-PT');
  });

  it('shows the saint of the day and a saying, with the sources credited', () => {
    render(<AlmanacCard now={SAINT_MARTIN} />);
    const card = screen.getByRole('article', { name: 'Almanaque' });
    expect(within(card).getByText('Santo do dia').nextElementSibling).toHaveTextContent(
      'São Martinho',
    );
    expect(within(card).getByText(/S\. Martinho/, { selector: 'blockquote' })).toHaveAttribute(
      'lang',
      'pt-PT',
    );
    expect(within(card).getByRole('link', { name: 'CC BY-SA 4.0' })).toBeInTheDocument();
  });

  it('keeps the saying in Portuguese and adds its meaning in English', async () => {
    render(<AlmanacCard now={SAINT_MARTIN} />);
    await act(() => i18n.changeLanguage('en'));
    expect(screen.getByText('Saint of the day').nextElementSibling).toHaveTextContent(
      'Saint Martin of Tours',
    );
    expect(screen.getByText(/S\. Martinho/, { selector: 'blockquote' })).toBeInTheDocument();
    expect(screen.getByText(/Saint Martin's day/, { selector: 'figcaption' })).toBeInTheDocument();
  });

  it('leaves out the saint on days without one', () => {
    render(<AlmanacCard now={new Date('2026-01-04T12:00:00Z')} />);
    expect(screen.queryByText('Santo do dia')).not.toBeInTheDocument();
    expect(screen.getByRole('blockquote')).toBeInTheDocument();
  });
});
