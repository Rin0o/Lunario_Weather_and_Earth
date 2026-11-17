import { createContext, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

/**
 * Screens, addressed by the URL hash (`#/culturas`, `#/cultura/alface`). Hash routes need no
 * server configuration, work offline from the service worker, and keep the back button working.
 */
export type Route =
  | { name: 'today' }
  | { name: 'sky' }
  | { name: 'alerts' }
  | { name: 'settings' }
  | { name: 'about' }
  | { name: 'garden' }
  | { name: 'crops' }
  | { name: 'crop'; id: string };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').replace(/\/$/, '');
  if (path === 'ceu') return { name: 'sky' };
  if (path === 'alertas') return { name: 'alerts' };
  if (path === 'definicoes') return { name: 'settings' };
  if (path === 'sobre') return { name: 'about' };
  if (path === 'horta') return { name: 'garden' };
  if (path === 'culturas') return { name: 'crops' };
  const crop = /^cultura\/([a-z_]+)$/.exec(path);
  if (crop?.[1]) return { name: 'crop', id: crop[1] };
  return { name: 'today' };
}

export const href = {
  today: '#/',
  sky: '#/ceu',
  alerts: '#/alertas',
  settings: '#/definicoes',
  about: '#/sobre',
  garden: '#/horta',
  crops: '#/culturas',
  crop: (id: string) => `#/cultura/${id}`,
};

/** The hash of a route, the inverse of `parseRoute`. */
export function hashOf(route: Route): string {
  return route.name === 'crop' ? href.crop(route.id) : href[route.name];
}

/** The four main screens, in the order of the tab bar: the pages of the notebook. */
export const TABS = ['today', 'sky', 'garden', 'crops'] as const;
type Tab = (typeof TABS)[number];

/** Where a tab sits in the notebook, or -1 for a secondary screen (settings, a crop sheet…). */
export function tabIndex(route: Route): number {
  return TABS.indexOf(route.name as Tab);
}

export type Turn = 'next' | 'previous';

/** Which way the notebook turns between two screens: only between two different tabs. */
export function turnBetween(from: Route, to: Route): Turn | null {
  const a = tabIndex(from);
  const b = tabIndex(to);
  if (a < 0 || b < 0 || a === b) return null;
  return b > a ? 'next' : 'previous';
}

/**
 * True if the browser can turn the page itself (View Transitions) and the user has not asked
 * for less motion. Otherwise the new page just slides in (see `usePageTurn`).
 */
export function canTurnPages(): boolean {
  return (
    typeof document.startViewTransition === 'function' &&
    !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Shows a new screen. Between two tabs, where the browser can, the old page turns over on
 * its binding like a notebook's (styles.css, "Turning the notebook's pages").
 */
function showScreen(turn: Turn | null, update: () => void): void {
  if (!turn || !canTurnPages()) {
    update();
    return;
  }
  const html = document.documentElement;
  html.dataset.turn = turn;
  const transition = document.startViewTransition(() => flushSync(update));
  void transition.finished.finally(() => delete html.dataset.turn);
}

/** The translation key of a route's name, for "back to …" labels. */
export function routeLabelKey(route: Route): string {
  return route.name === 'crop' ? 'nav.crops' : `nav.${route.name}`;
}

export interface Navigation {
  route: Route;
  /** The screen the user came from within the app, or null on a direct entry. */
  previous: Route | null;
}

const currentHash = () => hashOf(parseRoute(window.location.hash));
const MAX_TRAIL = 50;

/**
 * The current route and the trail of screens visited in the app, following hash changes
 * (links, the back and forward buttons). Going to the screen before the last one counts as
 * going back, so the trail matches the browser's history.
 */
export function useNavigation(): Navigation {
  const [trail, setTrail] = useState<string[]>(() => [currentHash()]);
  const shown = useRef(trail.at(-1) ?? '');
  useEffect(() => {
    const onChange = () => {
      const hash = currentHash();
      const turn = turnBetween(parseRoute(shown.current), parseRoute(hash));
      shown.current = hash;
      showScreen(turn, () => {
        setTrail((visited) => {
          if (visited.at(-1) === hash) return visited;
          if (visited.at(-2) === hash) return visited.slice(0, -1);
          return [...visited, hash].slice(-MAX_TRAIL);
        });
        window.scrollTo({ top: 0 });
      });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const before = trail.at(-2);
  return {
    route: parseRoute(trail.at(-1) ?? ''),
    previous: before === undefined ? null : parseRoute(before),
  };
}

/** The current route only. */
export function useRoute(): Route {
  return useNavigation().route;
}

/** The screen the user came from, for the back buttons (provided by App). */
export const PreviousRouteContext = createContext<Route | null>(null);
