import { describe, expect, it } from 'vitest';
import { buildTestFeed } from './feed.ts';

describe('buildTestFeed', () => {
  it('builds six consecutive fortnight events starting today', () => {
    const ics = buildTestFeed('2026-11-15', new Date(Date.UTC(2026, 10, 15))).replace(/\r\n /g, '');
    const starts = [...ics.matchAll(/DTSTART;VALUE=DATE:(\d+)/g)].map((m) => m[1]);
    expect(starts).toEqual([
      '20261115',
      '20261130',
      '20261215',
      '20261230',
      '20270114',
      '20270129',
    ]);
    expect(ics).toContain('X-WR-CALNAME:Lunário (teste)');
    expect(ics).toContain('DTEND;VALUE=DATE:20261130');
    expect(ics).not.toContain('VALARM');
  });
});
