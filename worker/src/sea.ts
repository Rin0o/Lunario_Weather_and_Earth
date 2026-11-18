/**
 * Sea agitation alerts (RF-21, D-37): IPMA's warnings for the district of each subscriber's
 * port, read four times a day (08, 12, 16 and 20 h in Portugal, never at night), notified
 * once per warning: orange and red, and yellow for those who asked for it.
 */
import { localStamp } from '../../app/src/astro/time.ts';
import { WARNING_AREAS } from '../../app/src/coast/ports.ts';
import {
  LEVELS,
  parseSeaWarnings,
  WARNINGS_URL,
  type WarningLevel,
} from '../../app/src/sea/seaForecast.ts';
import { enqueue, pushJob, type AlertMessage, type PushJob, type PushQueue } from './push.ts';
import type { SeenStore, SeenWarning, Store } from './store.ts';
import type { Language, SeaChoice, Subscription } from './subscription.ts';

/** Local hours of the checks. The cron runs at both UTC hours that can be each of them. */
export const SEA_HOURS = [8, 12, 16, 20] as const;
/** Seen warnings are kept a while after they end, in case IPMA brings one back. */
const FORGET_AFTER_MS = 2 * 24 * 60 * 60_000;

/** True when `now` is one of the check hours in Portugal (summer or winter time). */
export function seaCheckDue(now: Date): boolean {
  const hour = Number(localStamp(now).slice(11, 13));
  return (SEA_HOURS as readonly number[]).includes(hour);
}

const rank = (level: WarningLevel) => LEVELS.indexOf(level);

/**
 * Already notified: a seen warning in the same area, as severe or more, that overlaps or
 * touches it. So an extended or reissued warning is not news, a yellow right after an orange
 * is not either, but a warning that turns red is.
 */
export function alreadySeen(w: SeenWarning, seen: readonly SeenWarning[]): boolean {
  return seen.some(
    (s) =>
      s.area === w.area && rank(s.level) >= rank(w.level) && s.start <= w.end && w.start <= s.end,
  );
}

export interface AreaWarning extends SeenWarning {
  text: string;
}

/** The current warnings of the given areas, and those among them not notified before. */
export function newWarnings(
  json: unknown,
  areas: Iterable<string>,
  nowLocal: string,
  seen: readonly SeenWarning[],
): { current: AreaWarning[]; fresh: AreaWarning[] } {
  const current = [...new Set(areas)].flatMap((area) =>
    parseSeaWarnings(json, area, nowLocal).map((w) => ({ area, ...w })),
  );
  return { current, fresh: current.filter((w) => !alreadySeen(w, seen)) };
}

/** What to tell one subscriber: the most severe new warning they asked for (then the earliest). */
export function warningFor(fresh: readonly AreaWarning[], choice: SeaChoice): AreaWarning | null {
  const least = choice.yellow ? 0 : rank('orange');
  let best: AreaWarning | null = null;
  for (const w of fresh) {
    if (w.area !== choice.area || rank(w.level) < least) continue;
    if (!best || rank(w.level) > rank(best.level)) best = w;
  }
  return best;
}

const TEXTS: Record<
  Language,
  {
    locale: string;
    levels: Record<WarningLevel, string>;
    title: string;
    area: string;
    from: string;
    until: string;
    today: string;
    tomorrow: string;
  }
> = {
  'pt-PT': {
    locale: 'pt-PT',
    levels: { yellow: 'amarelo', orange: 'laranja', red: 'vermelho' },
    title: 'Aviso {level} de agitação marítima',
    area: 'Distrito de {area}',
    from: 'de {start} a {end}',
    until: 'até {end}',
    today: 'hoje',
    tomorrow: 'amanhã',
  },
  en: {
    locale: 'en-GB',
    levels: { yellow: 'Yellow', orange: 'Orange', red: 'Red' },
    title: '{level} rough sea warning',
    area: '{area} district',
    from: 'from {start} to {end}',
    until: 'until {end}',
    today: 'today',
    tomorrow: 'tomorrow',
  },
};

const ICONS: Record<WarningLevel, string> = { yellow: '🟡', orange: '🟠', red: '🔴' };

/** `2026-11-18T18:00…` as "hoje 18:00", "amanhã 06:00" or "sexta 06:00". */
function when(stamp: string, nowLocal: string, language: Language): string {
  const text = TEXTS[language];
  const day = stamp.slice(0, 10);
  const time = stamp.slice(11, 16);
  const daysAhead = Math.round(
    (Date.parse(`${day}T00:00Z`) - Date.parse(`${nowLocal.slice(0, 10)}T00:00Z`)) / 86_400_000,
  );
  const name =
    daysAhead === 0
      ? text.today
      : daysAhead === 1
        ? text.tomorrow
        : new Intl.DateTimeFormat(text.locale, { weekday: 'long', timeZone: 'UTC' })
            .format(new Date(`${day}T12:00Z`))
            .replace('-feira', '');
  return `${name} ${time}`;
}

/** The notification for a warning, in the subscriber's language. */
export function seaAlertFor(w: AreaWarning, language: Language, nowLocal: string): AlertMessage {
  const text = TEXTS[language];
  const end = when(w.end, nowLocal, language);
  const span =
    w.start <= nowLocal
      ? text.until.replace('{end}', end)
      : text.from.replace('{start}', when(w.start, nowLocal, language)).replace('{end}', end);
  const area = text.area.replace('{area}', WARNING_AREAS[w.area] ?? w.area);
  // IPMA writes the details only in Portuguese.
  const details = language === 'pt-PT' && w.text ? ` ${w.text}` : '';
  return {
    title: `${ICONS[w.level]} ${text.title.replace('{level}', text.levels[w.level])}`,
    body: `${area}, ${span}.${details}`,
    tag: `sea-${w.area}-${w.level}-${w.start}`,
    url: '/#/mar',
  };
}

/** Kept by the push service until the warning ends (local times; an hour off at most). */
export function seaTtl(w: SeenWarning, nowLocal: string): number {
  const seconds = (Date.parse(`${w.end}Z`) - Date.parse(`${nowLocal}Z`)) / 1000;
  return Math.round(Math.min(24 * 3600, Math.max(3600, seconds || 0)));
}

export interface SeaRunResult {
  areas: number;
  warnings: number;
  alerts: number;
  messages: number;
}

/**
 * The cron job: reads IPMA's warnings once, finds the new ones in the subscribers' areas and
 * queues one notification per subscriber concerned. Warnings are marked as seen only once
 * the notifications are queued.
 */
export async function runSeaAlerts(
  store: Pick<Store, 'list'> & SeenStore,
  queue: PushQueue,
  now: Date,
  fetchImpl: typeof fetch,
): Promise<SeaRunResult> {
  const subs = (await store.list()).filter(
    (s): s is Subscription & { sea: SeaChoice } => s.sea !== null,
  );
  const areas = new Set(subs.map((s) => s.sea.area));
  const result: SeaRunResult = { areas: areas.size, warnings: 0, alerts: 0, messages: 0 };
  if (areas.size === 0) return result;

  const response = await fetchImpl(WARNINGS_URL);
  if (!response.ok) throw new Error(`IPMA responded ${response.status}`);
  const json: unknown = await response.json();
  const nowLocal = localStamp(now);
  const { current, fresh } = newWarnings(json, areas, nowLocal, await store.listSeen());

  const jobs: PushJob[] = [];
  for (const sub of subs) {
    const w = warningFor(fresh, sub.sea);
    if (w)
      jobs.push(pushJob(sub, seaAlertFor(w, sub.language, nowLocal), 'sea', seaTtl(w, nowLocal)));
  }
  result.warnings = fresh.length;
  result.alerts = jobs.length;
  result.messages = await enqueue(queue, jobs);
  await store.saveSeen(current);
  await store.forgetSeenBefore(localStamp(new Date(now.getTime() - FORGET_AFTER_MS)));
  return result;
}
