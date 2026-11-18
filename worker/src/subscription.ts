/**
 * What the app sends to turn alerts on (D-33, D-37), and how the Worker checks it. One
 * subscription per phone, with the frost part, the sea part, or both.
 */
import { isWarningArea } from '../../app/src/coast/ports.ts';
import { roundCoordinate } from '../../app/src/frost/frost.ts';

export const LANGUAGES = ['pt-PT', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Frost alerts (RF-14): where to look at the night, and what to name in the alert. */
export interface FrostChoice {
  /** Rounded to 0.01° (~1 km), whatever the app sent. */
  latitude: number;
  longitude: number;
  /** Frost-sensitive crops in the garden, as display names in `language`. */
  crops: string[];
}

/** Sea agitation alerts (RF-21): the IPMA warning area of the chosen port. */
export interface SeaChoice {
  area: string;
  /** Yellow warnings too; orange and red always. */
  yellow: boolean;
}

export interface Subscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  language: Language;
  frost: FrostChoice | null;
  sea: SeaChoice | null;
}

/** Mainland Portugal with a margin: alerts are only meant for it (D-22). */
const BOUNDS = { south: 36.5, north: 42.5, west: -10, east: -6 };
const MAX_CROPS = 40;
const MAX_TEXT = 60;
const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function parseFrost(raw: Record<string, unknown>): FrostChoice | { error: string } {
  const { latitude, longitude, crops } = raw;
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
  return {
    latitude: roundCoordinate(latitude),
    longitude: roundCoordinate(longitude),
    crops: [...new Set(crops as string[])],
  };
}

function parseSea(raw: unknown): SeaChoice | { error: string } {
  if (!isObject(raw) || !isWarningArea(raw.area)) return { error: 'sea area is unknown' };
  if (typeof raw.yellow !== 'boolean') return { error: 'sea yellow must be true or false' };
  return { area: raw.area, yellow: raw.yellow };
}

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

  const { language } = body;
  if (!(LANGUAGES as readonly unknown[]).includes(language)) {
    return { error: `language must be one of ${LANGUAGES.join(', ')}` };
  }

  // Versions of the app from before the sea alerts send the frost fields at the top level.
  const legacy = !('frost' in body) && !('sea' in body);
  const given = (v: unknown) => v !== null && v !== undefined;
  let frost: FrostChoice | null = null;
  if (legacy || given(body.frost)) {
    const raw = legacy ? body : body.frost;
    if (!isObject(raw)) return { error: 'frost must be an object or null' };
    const parsed = parseFrost(raw);
    if ('error' in parsed) return parsed;
    frost = parsed;
  }
  let sea: SeaChoice | null = null;
  if (!legacy && given(body.sea)) {
    const parsed = parseSea(body.sea);
    if ('error' in parsed) return parsed;
    sea = parsed;
  }
  if (!frost && !sea) return { error: 'turn on frost or sea alerts, or unsubscribe' };

  return {
    endpoint,
    p256dh: p256dh as string,
    auth: auth as string,
    language: language as Language,
    frost,
    sea,
  };
}

/** The endpoint in an unsubscribe request body. */
export function parseEndpoint(body: unknown): string | null {
  return isObject(body) && typeof body.endpoint === 'string' && body.endpoint.length <= 1024
    ? body.endpoint
    : null;
}
