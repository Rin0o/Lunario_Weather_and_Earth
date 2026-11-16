/** What the app sends to turn frost alerts on (D-33), and how the Worker checks it. */
import { roundCoordinate } from '../../app/src/frost/frost.ts';

export const LANGUAGES = ['pt-PT', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

export interface Subscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  /** Rounded to 0.01° (~1 km), whatever the app sent. */
  latitude: number;
  longitude: number;
  /** Frost-sensitive crops in the garden, as display names in `language`. */
  crops: string[];
  language: Language;
}

/** Mainland Portugal with a margin: alerts are only meant for it (D-22). */
const BOUNDS = { south: 36.5, north: 42.5, west: -10, east: -6 };
const MAX_CROPS = 40;
const MAX_TEXT = 60;
const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** The subscription in a request body, or the reason it was refused. */
export function parseSubscription(body: unknown): Subscription | { error: string } {
  if (!isObject(body)) return { error: 'body must be a JSON object' };
  const sub = body.subscription;
  if (!isObject(sub) || !isObject(sub.keys)) return { error: 'subscription is missing' };

  const { endpoint } = sub;
  const { p256dh, auth } = sub.keys;
  if (typeof endpoint !== 'string' || endpoint.length > 1024 || !endpoint.startsWith('https://')) {
    return { error: 'endpoint must be an https URL' };
  }
  try {
    new URL(endpoint);
  } catch {
    return { error: 'endpoint must be an https URL' };
  }
  for (const [name, key] of [
    ['p256dh', p256dh],
    ['auth', auth],
  ] as const) {
    if (typeof key !== 'string' || key.length > 200 || !BASE64URL.test(key)) {
      return { error: `${name} must be base64url` };
    }
  }

  const { latitude, longitude, crops, language } = body;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return { error: 'latitude and longitude must be numbers' };
  }
  if (
    latitude < BOUNDS.south ||
    latitude > BOUNDS.north ||
    longitude < BOUNDS.west ||
    longitude > BOUNDS.east
  ) {
    return { error: 'location must be in mainland Portugal' };
  }
  if (
    !Array.isArray(crops) ||
    crops.length > MAX_CROPS ||
    !crops.every((c) => typeof c === 'string' && c.length > 0 && c.length <= MAX_TEXT)
  ) {
    return { error: `crops must be up to ${MAX_CROPS} short names` };
  }
  if (!(LANGUAGES as readonly unknown[]).includes(language)) {
    return { error: `language must be one of ${LANGUAGES.join(', ')}` };
  }

  return {
    endpoint,
    p256dh: p256dh as string,
    auth: auth as string,
    latitude: roundCoordinate(latitude),
    longitude: roundCoordinate(longitude),
    crops: [...new Set(crops as string[])],
    language: language as Language,
  };
}

/** The endpoint in an unsubscribe request body. */
export function parseEndpoint(body: unknown): string | null {
  return isObject(body) && typeof body.endpoint === 'string' && body.endpoint.length <= 1024
    ? body.endpoint
    : null;
}
