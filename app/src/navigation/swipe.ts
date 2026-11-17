import { useEffect, useState, type RefObject } from 'react';
import {
  TABS,
  canTurnPages,
  hashOf,
  parseRoute,
  tabIndex,
  turnBetween,
  type Route,
  type Turn,
} from './route.ts';

/** The tab a page turn leads to, or null at either end and on secondary screens. */
export function turnTarget(route: Route, turn: Turn): Route | null {
  const index = tabIndex(route);
  if (index < 0) return null;
  const name = TABS[index + (turn === 'next' ? 1 : -1)];
  return name ? { name } : null;
}

/** How far the finger must travel sideways, in CSS pixels. */
export const MIN_DISTANCE = 60;
/** Touches that start this close to a side edge belong to the system's back gesture. */
export const EDGE = 24;

export interface Stroke {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  /** Viewport width. */
  width: number;
}

/**
 * Reads a finished touch: a clear sideways stroke turns the page, right to left to the next
 * one (like a book), left to right to the previous one. Short, mostly vertical or edge
 * strokes are not page turns.
 */
export function readStroke({ startX, startY, endX, endY, width }: Stroke): Turn | null {
  if (startX < EDGE || startX > width - EDGE) return null;
  const dx = endX - startX;
  const dy = endY - startY;
  if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < 2 * Math.abs(dy)) return null;
  return dx < 0 ? 'next' : 'previous';
}

/** True if the touch began on something that needs sideways movement for itself. */
function ownsSidewaysMovement(target: EventTarget | null, root: Element): boolean {
  for (
    let el = target instanceof Element ? target : null;
    el && el !== root;
    el = el.parentElement
  ) {
    if (el.matches('input, textarea, select, [contenteditable], [data-no-swipe]')) return true;
    const { overflowX } = getComputedStyle(el);
    if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth) {
      return true;
    }
  }
  return false;
}

/**
 * Turns the notebook's pages with a sideways swipe over `area`, between the four tabs only.
 * The tab bar stays the main way to move; this is a shortcut for thumbs.
 */
export function useSwipeTabs(area: RefObject<HTMLElement | null>, route: Route): void {
  const current = hashOf(route);
  useEffect(() => {
    const root = area.current;
    const route = parseRoute(current);
    if (!root || tabIndex(route) < 0) return;
    let start: { x: number; y: number } | null = null;

    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      start =
        event.touches.length === 1 && touch && !ownsSidewaysMovement(event.target, root)
          ? { x: touch.clientX, y: touch.clientY }
          : null;
    };
    const onEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!start || !touch) return;
      const turn = readStroke({
        startX: start.x,
        startY: start.y,
        endX: touch.clientX,
        endY: touch.clientY,
        width: window.innerWidth,
      });
      start = null;
      const target = turn && turnTarget(route, turn);
      if (target) window.location.hash = hashOf(target);
    };
    const onCancel = () => {
      start = null;
    };

    root.addEventListener('touchstart', onStart, { passive: true });
    root.addEventListener('touchend', onEnd, { passive: true });
    root.addEventListener('touchcancel', onCancel, { passive: true });
    return () => {
      root.removeEventListener('touchstart', onStart);
      root.removeEventListener('touchend', onEnd);
      root.removeEventListener('touchcancel', onCancel);
    };
  }, [area, current]);
}

/**
 * The simpler page turn, for browsers that cannot turn the page itself (see `canTurnPages`):
 * which way the new page should slide in. Null for secondary screens, which simply appear.
 */
export function usePageTurn(route: Route): Turn | null {
  const [shown, setShown] = useState({ route, turn: null as Turn | null });
  if (hashOf(shown.route) !== hashOf(route)) {
    const turn = canTurnPages() ? null : turnBetween(shown.route, route);
    setShown({ route, turn });
    return turn;
  }
  return shown.turn;
}
