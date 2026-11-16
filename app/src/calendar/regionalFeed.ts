/**
 * Regional calendars (RF-12, D-30): one `.ics` feed per zone and language, generated at build
 * time from the catalogue, with an all-day event on the first day of each fortnight listing
 * what to sow, transplant, plant and harvest in that zone.
 */
import { ACTION_ORDER, activitiesIn, fortnightDates } from '../catalog/fortnights.ts';
import type { Catalog, Text, ZoneId } from '../catalog/types.ts';
import { buildIcs, type IcsEvent } from './ics.ts';
import { isoDateToNoonUtc } from './dates.ts';

export type FeedLanguage = 'pt-PT' | 'en';
export const FEED_LANGUAGES: readonly FeedLanguage[] = ['pt-PT', 'en'];

/** i18next-style translate function, so the build and the app share the same texts. */
export type Translate = (key: string, vars?: Record<string, string>) => string;

/** Published path of a zone's feed: `calendarios/zona-lc.ics`, `calendarios/zona-lc.en.ics`. */
export function feedPath(zoneId: ZoneId, language: FeedLanguage): string {
  return `calendarios/zona-${zoneId.toLowerCase()}${language === 'en' ? '.en' : ''}.ics`;
}

/**
 * Ways to subscribe to a feed served from `origin` (e.g. `https://lunario-4w2.pages.dev`).
 * Google's `cid` link is what worked on the family's Android phones (Q-09, test B2);
 * `webcal:` opens the calendar app on iPhone and most desktops.
 */
export function subscribeLinks(origin: string, path: string) {
  const url = new URL(path, origin.endsWith('/') ? origin : `${origin}/`);
  const webcal = `webcal://${url.host}${url.pathname}`;
  return {
    https: url.href,
    webcal,
    google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`,
  };
}

const intlLocale = (language: FeedLanguage) => (language === 'en' ? 'en-GB' : 'pt-PT');

export interface RegionalFeedOptions {
  source: Catalog;
  zoneId: ZoneId;
  /** Calendar years to cover, e.g. the build year and the next. */
  years: readonly number[];
  language: FeedLanguage;
  t: Translate;
  /** Address of the app, linked from every event. */
  siteUrl: string;
  /** Moment the file is generated; injectable for tests. */
  now?: Date;
}

export function buildRegionalFeed({
  source,
  zoneId,
  years,
  language,
  t,
  siteUrl,
  now,
}: RegionalFeedOptions): string {
  const zone = source.zones.find((z) => z.id === zoneId);
  if (!zone) throw new Error(`Unknown zone: ${zoneId}`);
  const pick = (text: Text) => (language === 'en' ? text.en : text.pt);
  const collator = new Intl.Collator(intlLocale(language));
  const range = new Intl.DateTimeFormat(intlLocale(language), {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  const zoneName = pick(zone.name);

  const events: IcsEvent[] = [];
  for (const year of years) {
    for (let fortnight = 1; fortnight <= 24; fortnight++) {
      const { first, last } = fortnightDates(fortnight, year);
      const dates = range.formatRange(isoDateToNoonUtc(first), isoDateToNoonUtc(last));
      const groups = activitiesIn(source, zoneId, fortnight, ACTION_ORDER);
      const notes = new Map<string, number>();

      const lines = groups.map(({ action, activities }) => {
        const crops = [...activities]
          .sort((a, b) => collator.compare(pick(a.crop.name), pick(b.crop.name)))
          .map(({ crop, note, endsNow }) => {
            let name = pick(crop.name);
            if (note) {
              const text = pick(note);
              if (!notes.has(text)) notes.set(text, notes.size + 1);
              name += ` (${String(notes.get(text))})`;
            }
            return endsNow ? `${name} – ${t('sowing.endsNow')}` : name;
          });
        return `${t(`sowing.actions.${action}`)}: ${crops.join(', ')}.`;
      });

      const description = [
        t('sowing.period', { dates, zone: zoneName }),
        '',
        ...(lines.length > 0 ? lines : [t('sowing.none')]),
        ...(notes.size > 0 ? ['', ...[...notes].map(([text, n]) => `(${String(n)}) ${text}`)] : []),
        '',
        t('feed.footer', { url: siteUrl }),
      ].join('\n');

      events.push({
        uid: `zona-${zoneId.toLowerCase()}-${String(year)}-${String(fortnight).padStart(2, '0')}@lunario`,
        title: t('feed.event', { dates }),
        date: first,
        description,
      });
    }
  }

  return buildIcs({ name: t('feed.name', { zone: zoneName }), events, now });
}
