import { act, fireEvent, render, renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { parseRoute, turnBetween, useNavigation, type Route } from './route.ts';
import { EDGE, MIN_DISTANCE, readStroke, turnTarget, usePageTurn, useSwipeTabs } from './swipe.ts';

const W = 390;
const stroke = (startX: number, endX: number, dy = 0) =>
  readStroke({ startX, startY: 300, endX, endY: 300 + dy, width: W });

describe('turnTarget', () => {
  it('goes through the four tabs in the order of the tab bar', () => {
    expect(turnTarget({ name: 'today' }, 'next')).toEqual({ name: 'sky' });
    expect(turnTarget({ name: 'sky' }, 'next')).toEqual({ name: 'garden' });
    expect(turnTarget({ name: 'garden' }, 'next')).toEqual({ name: 'crops' });
    expect(turnTarget({ name: 'crops' }, 'previous')).toEqual({ name: 'garden' });
    expect(turnTarget({ name: 'sky' }, 'previous')).toEqual({ name: 'today' });
  });

  it('stops at either end of the notebook', () => {
    expect(turnTarget({ name: 'today' }, 'previous')).toBeNull();
    expect(turnTarget({ name: 'crops' }, 'next')).toBeNull();
  });

  it('does nothing on secondary screens', () => {
    for (const route of [
      { name: 'settings' },
      { name: 'alerts' },
      { name: 'crop', id: 'alface' },
    ] as Route[]) {
      expect(turnTarget(route, 'next')).toBeNull();
      expect(turnTarget(route, 'previous')).toBeNull();
    }
  });
});

describe('readStroke', () => {
  it('turns forward on a stroke right to left, backward on left to right', () => {
    expect(stroke(300, 300 - MIN_DISTANCE)).toBe('next');
    expect(stroke(100, 100 + MIN_DISTANCE)).toBe('previous');
  });

  it('ignores short strokes', () => {
    expect(stroke(300, 300 - MIN_DISTANCE + 1)).toBeNull();
  });

  it('ignores strokes that are mostly vertical (scrolling)', () => {
    expect(stroke(300, 200, 80)).toBeNull();
    expect(stroke(300, 200, 40)).toBe('next');
  });

  it("leaves strokes from the screen's edges to the system's back gesture", () => {
    expect(stroke(EDGE - 1, 200)).toBeNull();
    expect(stroke(W - EDGE + 1, 200)).toBeNull();
  });
});

function Area({ route }: { route: Route }) {
  const ref = useRef<HTMLElement>(null);
  useSwipeTabs(ref, route);
  return (
    <main ref={ref}>
      <p>page</p>
      <input aria-label="field" />
    </main>
  );
}

const swipe = (el: Element, fromX: number, toX: number) => {
  fireEvent.touchStart(el, { touches: [{ clientX: fromX, clientY: 300 }] });
  fireEvent.touchEnd(el, { changedTouches: [{ clientX: toX, clientY: 305 }] });
};

describe('useSwipeTabs', () => {
  it('turns to the next tab on a swipe', () => {
    window.location.hash = '#/';
    const { getByText } = render(<Area route={{ name: 'today' }} />);
    swipe(getByText('page'), 300, 150);
    expect(parseRoute(window.location.hash)).toEqual({ name: 'sky' });
  });

  it('turns back on a swipe the other way', () => {
    window.location.hash = '#/horta';
    const { getByText } = render(<Area route={{ name: 'garden' }} />);
    swipe(getByText('page'), 100, 250);
    expect(parseRoute(window.location.hash)).toEqual({ name: 'sky' });
  });

  it('ignores swipes on a text field', () => {
    window.location.hash = '#/';
    const { getByLabelText } = render(<Area route={{ name: 'today' }} />);
    swipe(getByLabelText('field'), 300, 150);
    expect(parseRoute(window.location.hash)).toEqual({ name: 'today' });
  });

  it('ignores swipes on secondary screens', () => {
    window.location.hash = '#/cultura/alface';
    const { getByText } = render(<Area route={{ name: 'crop', id: 'alface' }} />);
    swipe(getByText('page'), 300, 150);
    expect(parseRoute(window.location.hash)).toEqual({ name: 'crop', id: 'alface' });
  });
});

describe('turnBetween', () => {
  it('turns forward to a later tab, backward to an earlier one, never for secondary screens', () => {
    expect(turnBetween({ name: 'today' }, { name: 'garden' })).toBe('next');
    expect(turnBetween({ name: 'crops' }, { name: 'sky' })).toBe('previous');
    expect(turnBetween({ name: 'crops' }, { name: 'crop', id: 'alface' })).toBeNull();
    expect(turnBetween({ name: 'settings' }, { name: 'today' })).toBeNull();
  });
});

describe('turning the page with View Transitions', () => {
  afterEach(() => {
    Reflect.deleteProperty(document, 'startViewTransition');
  });

  it('turns the page between tabs and marks the direction for the stylesheet', async () => {
    let finish = () => {};
    const finished = new Promise<void>((resolve) => (finish = resolve));
    const directions: (string | undefined)[] = [];
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: (update: () => void) => {
        directions.push(document.documentElement.dataset.turn);
        update();
        return { finished };
      },
    });
    window.location.hash = '#/';
    const { result } = renderHook(() => useNavigation());
    act(() => {
      window.location.hash = '#/horta';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(directions).toEqual(['next']);
    expect(result.current.route).toEqual({ name: 'garden' });
    await act(async () => {
      finish();
      await finished;
    });
    expect(document.documentElement.dataset.turn).toBeUndefined();

    act(() => {
      window.location.hash = '#/definicoes';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(directions).toEqual(['next']);
    expect(result.current.route).toEqual({ name: 'settings' });
  });
});

describe('usePageTurn', () => {
  it('turns forward to a later tab and backward to an earlier one', () => {
    const { result, rerender } = renderHook(({ route }) => usePageTurn(route), {
      initialProps: { route: { name: 'today' } as Route },
    });
    expect(result.current).toBeNull();
    act(() => rerender({ route: { name: 'garden' } }));
    expect(result.current).toBe('next');
    act(() => rerender({ route: { name: 'sky' } }));
    expect(result.current).toBe('previous');
  });

  it('does not animate secondary screens', () => {
    const { result, rerender } = renderHook(({ route }) => usePageTurn(route), {
      initialProps: { route: { name: 'crops' } as Route },
    });
    act(() => rerender({ route: { name: 'crop', id: 'alface' } }));
    expect(result.current).toBeNull();
    act(() => rerender({ route: { name: 'crops' } }));
    expect(result.current).toBeNull();
  });
});
