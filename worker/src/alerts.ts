/**
 * The nightly frost check (RF-14, RF-17, D-33): for each subscriber's own location, the same
 * thresholds as the warning in the app (D-32), over the coming night.
 */
import { dateInZone } from '../../app/src/astro/time.ts';
import { addDays, type IsoDate } from '../../app/src/calendar/dates.ts';
import { frostBetween, OPEN_METEO_URL, type FrostSpan } from '../../app/src/frost/frost.ts';
import type { Language, Subscription } from './subscription.ts';

/** Open-Meteo accepts many locations in one request; keep each request small. */
export const PLACES_PER_REQUEST = 50;

export interface Place {
  latitude: number;
  longitude: number;
}

const placeKey = (p: Place) => `${p.latitude.toFixed(2)},${p.longitude.toFixed(2)}`;

/** The distinct (already rounded) locations of the subscribers. */
export function distinctPlaces(subscriptions: readonly Place[]): Place[] {
  const places = new Map<string, Place>();
  for (const s of subscriptions) {
    places.set(placeKey(s), { latitude: s.latitude, longitude: s.longitude });
  }
  return [...places.values()];
}

export function forecastUrl(places: readonly Place[]): string {
  const params = new URLSearchParams({
    latitude: places.map((p) => p.latitude.toFixed(2)).join(','),
    longitude: places.map((p) => p.longitude.toFixed(2)).join(','),
    hourly: 'temperature_2m,soil_temperature_0cm',
    timezone: 'Europe/Lisbon',
    forecast_days: '2',
  });
  return `${OPEN_METEO_URL}?${params.toString()}`;
}

/** The coming night in Portugal: 18:00 today to 10:00 tomorrow, local time. */
export function tonight(now: Date): { from: string; to: string; date: IsoDate } {
  const today = dateInZone(now) as IsoDate;
  return { from: `${today}T18:00`, to: `${addDays(today, 1)}T10:00`, date: today };
}

const TEXTS: Record<Language, { frost: string; possible: string; temps: string; protect: string }> =
  {
    'pt-PT': {
      frost: 'Risco de geada esta noite',
      possible: 'Geada possível esta noite',
      temps: 'Mínimas previstas: ar {air}, superfície {surface}.',
      protect: 'Proteja: {crops}.',
    },
    en: {
      frost: 'Frost risk tonight',
      possible: 'Frost possible tonight',
      temps: 'Forecast lows: air {air}, ground {surface}.',
      protect: 'Protect: {crops}.',
    },
  };

const degrees = (n: number | null, language: Language) =>
  n === null
    ? '—'
    : `${new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'pt-PT', {
        maximumFractionDigits: 0,
      }).format(Math.round(n) || 0)} °C`;

export interface AlertMessage {
  title: string;
  body: string;
  /** Replaces an earlier alert for the same night instead of piling up. */
  tag: string;
}

/** The notification for one subscriber, or null when the night has no risk. */
export function alertFor(
  span: FrostSpan,
  subscription: Pick<Subscription, 'crops' | 'language'>,
  date: IsoDate,
): AlertMessage | null {
  if (span.risk === 'none') return null;
  const text = TEXTS[subscription.language];
  const temps = text.temps
    .replace('{air}', degrees(span.minAir, subscription.language))
    .replace('{surface}', degrees(span.minSurface, subscription.language));
  const protect =
    subscription.crops.length > 0
      ? ` ${text.protect.replace('{crops}', subscription.crops.join(', '))}`
      : '';
  return {
    title: `❄️ ${span.risk === 'frost' ? text.frost : text.possible}`,
    body: temps + protect,
    tag: `frost-${date}`,
  };
}

/** Open-Meteo answers one object for one location and an array for several. */
export function forecastsFrom(json: unknown, count: number): unknown[] {
  const list = Array.isArray(json) ? json : [json];
  return list.length === count ? list : [];
}

/** The night's frost per place, fetching the forecasts in small batches. */
export async function nightlyFrost(
  places: readonly Place[],
  now: Date,
  fetchImpl: typeof fetch,
): Promise<Map<string, FrostSpan>> {
  const { from, to } = tonight(now);
  const result = new Map<string, FrostSpan>();
  for (let i = 0; i < places.length; i += PLACES_PER_REQUEST) {
    const batch = places.slice(i, i + PLACES_PER_REQUEST);
    const response = await fetchImpl(forecastUrl(batch));
    if (!response.ok) throw new Error(`Open-Meteo responded ${response.status}`);
    const forecasts = forecastsFrom(await response.json(), batch.length);
    batch.forEach((place, j) => {
      const span = frostBetween(forecasts[j], from, to);
      if (span) result.set(placeKey(place), span);
    });
  }
  return result;
}

export interface Sender {
  /** Sends one notification; returns the push service's HTTP status. */
  send(subscription: Subscription, message: AlertMessage): Promise<number>;
}

export interface Store {
  list(): Promise<Subscription[]>;
  remove(endpoint: string): Promise<void>;
}

export interface RunResult {
  places: number;
  sent: number;
  removed: number;
  failed: number;
}

/**
 * The cron job: checks tonight's frost at every subscriber's location and notifies those at
 * risk. Subscriptions the push service no longer knows (404, 410) are deleted.
 */
export async function runAlerts(
  store: Store,
  sender: Sender,
  now: Date,
  fetchImpl: typeof fetch,
): Promise<RunResult> {
  const subscriptions = await store.list();
  const places = distinctPlaces(subscriptions);
  const frost = await nightlyFrost(places, now, fetchImpl);
  const { date } = tonight(now);
  const result: RunResult = { places: places.length, sent: 0, removed: 0, failed: 0 };

  for (const sub of subscriptions) {
    const span = frost.get(placeKey(sub));
    const message = span ? alertFor(span, sub, date) : null;
    if (!message) continue;
    let status: number;
    try {
      status = await sender.send(sub, message);
    } catch {
      result.failed++;
      continue;
    }
    if (status === 404 || status === 410) {
      await store.remove(sub.endpoint);
      result.removed++;
    } else if (status >= 200 && status < 300) {
      result.sent++;
    } else {
      result.failed++;
    }
  }
  return result;
}
