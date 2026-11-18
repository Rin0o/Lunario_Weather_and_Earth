// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseEndpoint, parseSubscription } from './subscription.ts';

const PUSH = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  keys: {
    p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u',
    auth: 'tBHItJI5svbpez7KI4CCXg', // gitleaks:allow (made-up test value, not a secret)
  },
};

/** What versions of the app from before the sea alerts send: frost only, at the top level. */
export const BODY = {
  subscription: PUSH,
  latitude: 40.53731,
  longitude: -7.26759,
  crops: ['Tomate', 'Feijão-verde', 'Tomate'],
  language: 'pt-PT',
};

/** What the app sends now, here with both kinds of alerts. */
export const BOTH_BODY = {
  subscription: PUSH,
  language: 'pt-PT',
  frost: { latitude: 40.53731, longitude: -7.26759, crops: ['Tomate'] },
  sea: { area: 'AVR', yellow: false },
};

const FROST = { latitude: 40.54, longitude: -7.27, crops: ['Tomate', 'Feijão-verde'] };

describe('parseSubscription', () => {
  it('reads the frost fields of older app versions, rounding the location to ~1 km', () => {
    expect(parseSubscription(BODY)).toEqual({
      endpoint: PUSH.endpoint,
      p256dh: PUSH.keys.p256dh,
      auth: PUSH.keys.auth,
      language: 'pt-PT',
      frost: FROST,
      sea: null,
    });
  });

  it('reads frost and sea alerts, either or both', () => {
    expect(parseSubscription(BOTH_BODY)).toMatchObject({
      frost: { latitude: 40.54, longitude: -7.27, crops: ['Tomate'] },
      sea: { area: 'AVR', yellow: false },
    });
    // Sea only: no location at all.
    expect(parseSubscription({ ...BOTH_BODY, frost: null })).toMatchObject({
      frost: null,
      sea: { area: 'AVR', yellow: false },
    });
    expect(
      parseSubscription({ ...BOTH_BODY, frost: undefined, sea: { area: 'FAR', yellow: true } }),
    ).toMatchObject({ frost: null, sea: { area: 'FAR', yellow: true } });
    expect(parseSubscription({ ...BOTH_BODY, sea: null })).toMatchObject({ sea: null });
  });

  it.each([
    [null, 'body must be a JSON object'],
    [{ ...BODY, subscription: undefined }, 'subscription is missing'],
    [
      { ...BODY, subscription: { ...PUSH, endpoint: 'http://push.example' } },
      'endpoint must be an https URL',
    ],
    [{ ...BODY, subscription: { ...PUSH, endpoint: 'https://' } }, 'endpoint must be an https URL'],
    [
      { ...BODY, subscription: { ...PUSH, keys: { p256dh: 'not base64!', auth: 'x' } } },
      'p256dh must be base64url',
    ],
    [{ ...BODY, latitude: '40' }, 'latitude and longitude must be numbers'],
    [{ ...BODY, latitude: 48.85, longitude: 2.35 }, 'location must be in mainland Portugal'],
    [{ ...BODY, crops: 'Tomate' }, 'crops must be up to 40 short names'],
    [{ ...BODY, crops: ['x'.repeat(61)] }, 'crops must be up to 40 short names'],
    [{ ...BODY, language: 'fr' }, 'language must be one of pt-PT, en'],
    [{ ...BOTH_BODY, frost: 'yes' }, 'frost must be an object or null'],
    [{ ...BOTH_BODY, frost: { latitude: 40 } }, 'latitude and longitude must be numbers'],
    [{ ...BOTH_BODY, sea: { area: 'GRD', yellow: false } }, 'sea area is unknown'],
    [{ ...BOTH_BODY, sea: { area: 'toString', yellow: false } }, 'sea area is unknown'],
    [{ ...BOTH_BODY, sea: { area: 'AVR' } }, 'sea yellow must be true or false'],
    [{ ...BOTH_BODY, frost: null, sea: null }, 'turn on frost or sea alerts, or unsubscribe'],
  ])('refuses %j', (body, error) => {
    expect(parseSubscription(body)).toEqual({ error });
  });
});

describe('parseEndpoint', () => {
  it('reads the endpoint to unsubscribe', () => {
    expect(parseEndpoint({ endpoint: 'https://push.example/1' })).toBe('https://push.example/1');
    expect(parseEndpoint({})).toBeNull();
    expect(parseEndpoint('x')).toBeNull();
  });
});
