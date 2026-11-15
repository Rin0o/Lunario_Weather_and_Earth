import { describe, expect, it } from 'vitest';
import {
  addDays,
  alarmTrigger,
  buildIcs,
  escapeText,
  foldLine,
  formatIcsDate,
  googleCalendarUrl,
  toIsoDate,
} from './ics.ts';

const unfold = (text: string) => text.replace(/\r\n /g, '');

describe('dates', () => {
  it('adds days across month, year and DST boundaries', () => {
    expect(addDays('2026-11-28', 5)).toBe('2026-12-03');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-03-27', 2)).toBe('2027-03-29'); // EU summer time starts 28 March
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29'); // leap year
    expect(addDays('2026-11-21', -5)).toBe('2026-11-16');
  });

  it('formats iCalendar dates and local ISO dates', () => {
    expect(formatIcsDate('2026-11-21')).toBe('20261121');
    expect(toIsoDate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });

  it('rejects malformed dates', () => {
    expect(() => addDays('2026-xx-01' as never, 1)).toThrow('Invalid date');
  });
});

describe('alarmTrigger', () => {
  it.each([
    [{ daysBefore: 5, time: '13:00' }, '-P4DT11H'],
    [{ daysBefore: 1, time: '09:30' }, '-PT14H30M'],
    [{ daysBefore: 0, time: '13:00' }, 'PT13H'],
    [{ daysBefore: 0, time: '00:00' }, 'PT0M'],
    [{ daysBefore: 2, time: '00:00' }, '-P2D'],
    [{ daysBefore: 7, time: '08:05' }, '-P6DT15H55M'],
  ] as const)('%o → %s', (alarm, expected) => {
    expect(alarmTrigger(alarm)).toBe(expected);
  });

  it.each([
    { daysBefore: -1, time: '13:00' },
    { daysBefore: 1.5, time: '13:00' },
    { daysBefore: 1, time: '24:00' },
    { daysBefore: 1, time: '12:60' },
    { daysBefore: 1, time: '13' },
  ] as const)('rejects %o', (alarm) => {
    expect(() => alarmTrigger(alarm as never)).toThrow('Invalid alarm');
  });
});

describe('escapeText', () => {
  it('escapes backslashes, separators and newlines', () => {
    expect(escapeText('Alface; couve, nabo\\x\nlinha 2\r\nlinha 3')).toBe(
      'Alface\\; couve\\, nabo\\\\x\\nlinha 2\\nlinha 3',
    );
  });
});

describe('foldLine', () => {
  it('leaves short lines alone', () => {
    expect(foldLine('SUMMARY:Alface')).toBe('SUMMARY:Alface');
  });

  it('folds at 75 octets without splitting multi-byte characters', () => {
    const line = `DESCRIPTION:${'Transplantação das alfaces à sombra. '.repeat(6)}🌱`;
    const folded = foldLine(line);
    const encoder = new TextEncoder();
    for (const physical of folded.split('\r\n')) {
      expect(encoder.encode(physical).length).toBeLessThanOrEqual(75);
    }
    expect(unfold(folded)).toBe(line);
    expect(folded).not.toContain('�');
  });
});

describe('buildIcs', () => {
  const now = new Date(Date.UTC(2026, 10, 15, 12, 0, 0));

  it('builds a valid calendar with an all-day event and an alarm', () => {
    const ics = buildIcs({
      now,
      name: 'Lunário',
      events: [
        {
          uid: 'test-1@lunario',
          title: 'Transplantar alfaces',
          date: '2026-11-21',
          description: 'Sementeira em viveiro a 2026-10-10.',
          alarm: { daysBefore: 5, time: '13:00' },
        },
      ],
    });

    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/); // CRLF only
    const lines = unfold(ics).split('\r\n');
    expect(lines).toEqual(
      expect.arrayContaining([
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'X-WR-CALNAME:Lunário',
        'UID:test-1@lunario',
        'DTSTAMP:20261115T120000Z',
        'DTSTART;VALUE=DATE:20261121',
        'DTEND;VALUE=DATE:20261122',
        'SUMMARY:Transplantar alfaces',
        'DESCRIPTION:Sementeira em viveiro a 2026-10-10.',
        'TRIGGER:-P4DT11H',
        'END:VCALENDAR',
      ]),
    );
    expect(lines.indexOf('BEGIN:VALARM')).toBeLessThan(lines.indexOf('END:VALARM'));
  });

  it('supports multi-day events without alarm or description', () => {
    const ics = unfold(
      buildIcs({ now, events: [{ uid: 'q1', title: 'Quinzena', date: '2026-12-01', days: 15 }] }),
    );
    expect(ics).toContain('DTEND;VALUE=DATE:20261216');
    expect(ics).not.toContain('VALARM');
    expect(ics).not.toContain('DESCRIPTION');
    expect(ics).not.toContain('X-WR-CALNAME');
  });
});

describe('googleCalendarUrl', () => {
  it('builds an add-event link for an all-day event', () => {
    const url = new URL(
      googleCalendarUrl({ title: 'Colher alfaces', date: '2026-11-21', description: 'Notas' }),
    );
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('Colher alfaces');
    expect(url.searchParams.get('dates')).toBe('20261121/20261122');
    expect(url.searchParams.get('details')).toBe('Notas');
  });

  it('omits details when there is no description', () => {
    const url = new URL(googleCalendarUrl({ title: 'X', date: '2026-11-21', days: 2 }));
    expect(url.searchParams.has('details')).toBe(false);
    expect(url.searchParams.get('dates')).toBe('20261121/20261123');
  });
});
