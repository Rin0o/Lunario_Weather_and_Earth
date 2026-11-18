import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { href, parseRoute, useRoute } from './route.ts';

describe('parseRoute', () => {
  it.each([
    ['', { name: 'today' }],
    ['#/', { name: 'today' }],
    ['#/horta', { name: 'garden' }],
    ['#/culturas', { name: 'crops' }],
    ['#/culturas/', { name: 'crops' }],
    ['#/biblioteca', { name: 'crops' }],
    ['#/ditados', { name: 'sayings' }],
    ['#/cultura/alface', { name: 'crop', id: 'alface' }],
    ['#/cultura/couve_flor', { name: 'crop', id: 'couve_flor' }],
    ['#/cultura/../../x', { name: 'today' }],
    ['#/whatever', { name: 'today' }],
  ])('%s → %o', (hash, route) => {
    expect(parseRoute(hash)).toEqual(route);
  });

  it('builds links that parse back', () => {
    expect(parseRoute(href.crop('tomate'))).toEqual({ name: 'crop', id: 'tomate' });
    expect(parseRoute(href.crops)).toEqual({ name: 'crops' });
    expect(parseRoute(href.sayings)).toEqual({ name: 'sayings' });
    expect(parseRoute(href.garden)).toEqual({ name: 'garden' });
    expect(parseRoute(href.sky)).toEqual({ name: 'sky' });
    expect(parseRoute(href.alerts)).toEqual({ name: 'alerts' });
    expect(parseRoute(href.settings)).toEqual({ name: 'settings' });
    expect(parseRoute(href.today)).toEqual({ name: 'today' });
  });
});

describe('useRoute', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('follows hash changes', () => {
    const { result } = renderHook(() => useRoute());
    expect(result.current).toEqual({ name: 'today' });
    act(() => {
      window.location.hash = '#/cultura/fava';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(result.current).toEqual({ name: 'crop', id: 'fava' });
  });
});
