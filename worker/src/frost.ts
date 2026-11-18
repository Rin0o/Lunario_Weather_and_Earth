/**
 * The nightly frost check (RF-14, RF-17, D-33): for each subscriber's own location, the same
 * thresholds as the warning in the app (D-32), over the coming night.
 */
import { dateInZone } from '../../app/src/astro/time.ts';
import { addDays, type IsoDate } from '../../app/src/calendar/dates.ts';
import { frostBetween, OPEN_METEO_URL, type FrostSpan } from '../../app/src/frost/frost.ts';
import { enqueue, pushJob, type AlertMessage, type PushJob, type PushQueue } from './push.ts';
import type { Store } from './store.ts';
import type { FrostChoice, Language, Subscription } from './subscription.ts';

/** Open-Meteo accepts many locations in one request; keep each request small. */
export const PLACES_PER_REQUEST = 50;
/** Useless after the night. */
const FROST_TTL = 12 * 60 * 60;

export interface Place {
  latitude: number;
  longitude: number;
}

const placeKey = (p: Place) => `${p.latitude.toFixed(2)},${p.longitude.toFixed(2)}`;

/** The distinct (already rounded) locations of the subscribers. */
export function distinctPlaces(choices: readonly Place[]): Place[] {
  const places = new Map<string, Place>();
  for (const s of choices) {
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

/** The notification for one subscriber, or null when the night has no risk. */
export function alertFor(
  span: FrostSpan,
  choice: { crops: string[]; language: Language },
  date: IsoDate,
): AlertMessage | null {
  if (span.risk === 'none') return null;
  const text = TEXTS[choice.language];
  const temps = text.temps
    .replace('{air}', degrees(span.minAir, choice.language))
    .replace('{surface}', degrees(span.minSurface, choice.language));
  const protect =
    choice.crops.length > 0 ? ` ${text.protect.replace('{crops}', choice.crops.join(', '))}` : '';
  return {
    title: `❄️ ${span.risk === 'frost' ? text.frost : text.possible}`,
    body: temps + protect,
    tag: `frost-${date}`,
    url: '/',
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

type FrostSubscription = Subscription & { frost: FrostChoice };

/** The pushes for tonight: one for each frost subscriber whose place is at risk. */
export async function frostJobs(
  subscriptions: readonly Subscription[],
  now: Date,
  fetchImpl: typeof fetch,
): Promise<{ places: number; jobs: PushJob[] }> {
  const frostSubs = subscriptions.filter((s): s is FrostSubscription => s.frost !== null);
  const places = distinctPlaces(frostSubs.map((s) => s.frost));
  if (places.length === 0) return { places: 0, jobs: [] };
  const frost = await nightlyFrost(places, now, fetchImpl);
  const { date } = tonight(now);
  const jobs: PushJob[] = [];
  for (const sub of frostSubs) {
    const span = frost.get(placeKey(sub.frost));
    const message = span
      ? alertFor(span, { crops: sub.frost.crops, language: sub.language }, date)
      : null;
    if (message) jobs.push(pushJob(sub, message, 'frost', FROST_TTL));
  }
  return { places: places.length, jobs };
}

/** The evening cron job: works out tonight's frost alerts and queues them for sending. */
export async function runFrostAlerts(
  store: Pick<Store, 'list'>,
  queue: PushQueue,
  now: Date,
  fetchImpl: typeof fetch,
): Promise<{ places: number; alerts: number; messages: number }> {
  const { places, jobs } = await frostJobs(await store.list(), now, fetchImpl);
  return { places, alerts: jobs.length, messages: await enqueue(queue, jobs) };
}
