import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initI18n } from '../i18n/index.ts';
import { BackButton } from './BackButton.tsx';
import { PreviousRouteContext, useNavigation, type Route } from './route.ts';

const goTo = (hash: string) =>
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

const withPrevious = (previous: Route | null) =>
  render(
    <PreviousRouteContext.Provider value={previous}>
      <BackButton fallback={{ name: 'crops' }} />
    </PreviousRouteContext.Provider>,
  );

describe('BackButton', () => {
  beforeEach(async () => {
    await initI18n('pt-PT');
  });
  afterEach(() => vi.restoreAllMocks());

  it('goes back to the screen the user came from, named', async () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    withPrevious({ name: 'garden' });
    const button = screen.getByRole('link', { name: 'Voltar a Horta' });
    expect(button).toHaveTextContent('Horta');
    await userEvent.click(button);
    expect(back).toHaveBeenCalledOnce();
  });

  it('names a crop sheet by its crop', () => {
    withPrevious({ name: 'crop', id: 'tomate' });
    expect(screen.getByRole('link', { name: 'Voltar a Tomate' })).toHaveAttribute(
      'href',
      '#/cultura/tomate',
    );
  });

  it("goes to the screen's parent when opened directly", () => {
    const back = vi.spyOn(window.history, 'back');
    withPrevious(null);
    const button = screen.getByRole('link', { name: 'Voltar a Culturas' });
    expect(button).toHaveAttribute('href', '#/culturas');
    button.click();
    expect(back).not.toHaveBeenCalled();
  });
});

describe('useNavigation', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('keeps the trail of screens, and steps back when the user goes back', () => {
    window.location.hash = '';
    const { result } = renderHook(() => useNavigation());
    expect(result.current).toEqual({ route: { name: 'today' }, previous: null });

    goTo('#/horta');
    expect(result.current).toEqual({ route: { name: 'garden' }, previous: { name: 'today' } });
    goTo('#/cultura/fava');
    expect(result.current.previous).toEqual({ name: 'garden' });

    // The phone's back button (or ours) returns to the garden, whose previous is Hoje again.
    goTo('#/horta');
    expect(result.current).toEqual({ route: { name: 'garden' }, previous: { name: 'today' } });

    // The same screen again changes nothing.
    goTo('#/horta');
    expect(result.current.previous).toEqual({ name: 'today' });
  });
});
