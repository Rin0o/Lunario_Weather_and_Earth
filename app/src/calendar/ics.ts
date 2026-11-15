/**
 * Minimal iCalendar (RFC 5545) writer for all-day reminder events.
 * Used by the garden reminders (RF-13) and the regional calendars (RF-12).
 */

/** A calendar date in ISO form, `YYYY-MM-DD`. No time zone: all-day events are floating. */
export type IsoDate = `${number}-${number}-${number}`;

export interface Alarm {
  /** Whole days before the event day. */
  daysBefore: number;
  /** Local time of the reminder on that day, `HH:MM`. */
  time: `${number}:${number}`;
}

export interface IcsEvent {
  uid: string;
  title: string;
  date: IsoDate;
  /** Number of days the event lasts. Defaults to 1. */
  days?: number;
  description?: string;
  alarm?: Alarm;
}

export interface IcsCalendar {
  events: readonly IcsEvent[];
  /** Calendar name shown by apps that subscribe to the feed. */
  name?: string;
  /** Moment the file is generated; injectable for tests. */
  now?: Date;
}

const CRLF = '\r\n';
const MAX_LINE_OCTETS = 75;

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

function parseIsoDate(date: IsoDate): Date {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) throw new Error(`Invalid date: ${date}`);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Adds whole days to an ISO date, independent of the local time zone and DST. */
export function addDays(date: IsoDate, days: number): IsoDate {
  const d = parseIsoDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` as IsoDate;
}

/** The local calendar date of a moment, as an ISO date. */
export function toIsoDate(moment: Date): IsoDate {
  return `${moment.getFullYear()}-${pad(moment.getMonth() + 1)}-${pad(moment.getDate())}` as IsoDate;
}

/** `2026-11-21` → `20261121` (iCalendar DATE). */
export function formatIcsDate(date: IsoDate): string {
  return date.replaceAll('-', '');
}

function formatUtcDateTime(moment: Date): string {
  return (
    `${moment.getUTCFullYear()}${pad(moment.getUTCMonth() + 1)}${pad(moment.getUTCDate())}` +
    `T${pad(moment.getUTCHours())}${pad(moment.getUTCMinutes())}${pad(moment.getUTCSeconds())}Z`
  );
}

/** Escapes TEXT values (RFC 5545 §3.3.11). */
export function escapeText(text: string): string {
  return text
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Folds a content line so no physical line exceeds 75 octets (RFC 5545 §3.1),
 * never splitting a multi-byte UTF-8 character.
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // Continuation lines start with a space, which counts towards their 75 octets.
    const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    if (octets + size > limit) {
      parts.push(current);
      current = '';
      octets = 0;
    }
    current += char;
    octets += size;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

/**
 * Trigger for an alarm relative to the start of an all-day event (midnight).
 * 5 days before at 13:00 → `-P4DT11H`.
 */
export function alarmTrigger({ daysBefore, time }: Alarm): string {
  const [hours, minutes] = time.split(':').map(Number);
  if (
    hours === undefined ||
    minutes === undefined ||
    !Number.isInteger(daysBefore) ||
    daysBefore < 0 ||
    hours > 23 ||
    minutes > 59
  ) {
    throw new Error(`Invalid alarm: ${daysBefore} days before at ${time}`);
  }
  const offset = -daysBefore * 24 * 60 + hours * 60 + minutes;
  if (offset === 0) return 'PT0M';
  const abs = Math.abs(offset);
  const d = Math.floor(abs / 1440);
  const h = Math.floor((abs % 1440) / 60);
  const m = abs % 60;
  const clock = h || m ? `T${h ? `${h}H` : ''}${m ? `${m}M` : ''}` : '';
  return `${offset < 0 ? '-' : ''}P${d ? `${d}D` : ''}${clock}`;
}

function eventLines(event: IcsEvent, stamp: string): string[] {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${formatIcsDate(event.date)}`,
    `DTEND;VALUE=DATE:${formatIcsDate(addDays(event.date, event.days ?? 1))}`,
    `SUMMARY:${escapeText(event.title)}`,
    'TRANSP:TRANSPARENT',
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.alarm) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(event.title)}`,
      `TRIGGER:${alarmTrigger(event.alarm)}`,
      'END:VALARM',
    );
  }
  lines.push('END:VEVENT');
  return lines;
}

/** Builds a complete `.ics` file with CRLF line endings. */
export function buildIcs({ events, name, now = new Date() }: IcsCalendar): string {
  const stamp = formatUtcDateTime(now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lunario//Lunario//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  if (name) lines.push(`X-WR-CALNAME:${escapeText(name)}`);
  for (const event of events) lines.push(...eventLines(event, stamp));
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join(CRLF) + CRLF;
}

/**
 * Google Calendar "add event" link: a fallback for phones whose calendar app cannot open
 * `.ics` files. Google applies its default reminder; a custom alarm cannot be passed.
 */
export function googleCalendarUrl(
  event: Pick<IcsEvent, 'title' | 'date' | 'days' | 'description'>,
) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatIcsDate(event.date)}/${formatIcsDate(addDays(event.date, event.days ?? 1))}`,
  });
  if (event.description) params.set('details', event.description);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
