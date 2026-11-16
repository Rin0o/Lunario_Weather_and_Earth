// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseEndpoint, parseSubscription } from './subscription.ts';

export const BODY = {
  subscription: {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
    keys: {
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u',
      auth: 'tBHItJI5svbpez7KI4CCXg', // gitleaks:allow (made-up test value, not a secret)
    },
  },
  latitude: 40.53731,
  longitude: -7.26759,
  crops: ['Tomate', 'Feijão-verde', 'Tomate'],
  language: 'pt-PT',
};

describe('parseSubscription', () => {
  it('accepts a valid body, rounding the location to ~1 km and dropping repeated crops', () => {
    expect(parseSubscription(BODY)).toEqual({
      endpoint: BODY.subscription.endpoint,
      p256dh: BODY.subscription.keys.p256dh,
      auth: BODY.subscription.keys.auth,
      latitude: 40.54,
      longitude: -7.27,
      crops: ['Tomate', 'Feijão-verde'],
      language: 'pt-PT',
    });
  });

  it.each([
    [null, 'body must be a JSON object'],
    [{ ...BODY, subscription: undefined }, 'subscription is missing'],
    [
      { ...BODY, subscription: { ...BODY.subscription, endpoint: 'http://push.example' } },
      'endpoint must be an https URL',
    ],
    [
      { ...BODY, subscription: { ...BODY.subscription, endpoint: 'https://' } },
      'endpoint must be an https URL',
    ],
    [
      {
        ...BODY,
        subscription: { ...BODY.subscription, keys: { p256dh: 'not base64!', auth: 'x' } },
      },
      'p256dh must be base64url',
    ],
    [{ ...BODY, latitude: '40' }, 'latitude and longitude must be numbers'],
    [{ ...BODY, latitude: 48.85, longitude: 2.35 }, 'location must be in mainland Portugal'],
    [{ ...BODY, crops: 'Tomate' }, 'crops must be up to 40 short names'],
    [{ ...BODY, crops: ['x'.repeat(61)] }, 'crops must be up to 40 short names'],
    [{ ...BODY, language: 'fr' }, 'language must be one of pt-PT, en'],
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
