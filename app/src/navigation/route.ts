import { createContext, useEffect, useState } from 'react';

/**
 * Screens, addressed by the URL hash (`#/culturas`, `#/cultura/alface`). Hash routes need no
 * server configuration, work offline from the service worker, and keep the back button working.
 */
export type Route =
  | { name: 'today' }
  | { name: 'sky' }
  | { name: 'alerts' }
  | { name: 'settings' }
  | { name: 'garden' }
  | { name: 'crops' }
  | { name: 'crop'; id: string };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').replace(/\/$/, '');
  if (path === 'ceu') return { name: 'sky' };
  if (path === 'alertas') return { name: 'alerts' };
  if (path === 'definicoes') return { name: 'settings' };
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
  garden: '#/horta',
  crops: '#/culturas',
  crop: (id: string) => `#/cultura/${id}`,
};

/** The hash of a route, the inverse of `parseRoute`. */
export function hashOf(route: Route): string {
  return route.name === 'crop' ? href.crop(route.id) : href[route.name];
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
  useEffect(() => {
    const onChange = () => {
      const hash = currentHash();
      setTrail((visited) => {
        if (visited.at(-1) === hash) return visited;
        if (visited.at(-2) === hash) return visited.slice(0, -1);
        return [...visited, hash].slice(-MAX_TRAIL);
      });
      window.scrollTo({ top: 0 });
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
