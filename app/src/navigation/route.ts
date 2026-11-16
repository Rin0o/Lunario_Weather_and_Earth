import { useEffect, useState } from 'react';

/**
 * Screens, addressed by the URL hash (`#/culturas`, `#/cultura/alface`). Hash routes need no
 * server configuration, work offline from the service worker, and keep the back button working.
 */
export type Route =
  { name: 'today' } | { name: 'garden' } | { name: 'crops' } | { name: 'crop'; id: string };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').replace(/\/$/, '');
  if (path === 'horta') return { name: 'garden' };
  if (path === 'culturas') return { name: 'crops' };
  const crop = /^cultura\/([a-z_]+)$/.exec(path);
  if (crop?.[1]) return { name: 'crop', id: crop[1] };
  return { name: 'today' };
}

export const href = {
  today: '#/',
  garden: '#/horta',
  crops: '#/culturas',
  crop: (id: string) => `#/cultura/${id}`,
};

/** The current route, following hash changes (links, back and forward buttons). */
export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
