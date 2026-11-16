import i18n from 'i18next';
import { beforeEach, describe, expect, it } from 'vitest';
import { catalog } from '../catalog/catalog.ts';
import { initI18n } from '../i18n/index.ts';
import { buildRegionalFeed, feedPath, subscribeLinks, type FeedLanguage } from './regionalFeed.ts';

const NOW = new Date(Date.UTC(2026, 10, 16, 9));

/** Unfolds and unescapes the feed so assertions read like the text the calendar shows. */
const feed = (zoneId: 'LC' | 'IN' | 'LN' | 'SU', language: FeedLanguage = 'pt-PT') =>
  buildRegionalFeed({
    source: catalog,
    zoneId,
    years: [2026, 2027],
    language,
    t: (key, vars) => i18n.t(key, { ...vars, lng: language }),
    siteUrl: 'https://lunario.example/',
    now: NOW,
  })
    .replace(/\r\n /g, '')
    .replaceAll('\\n', '\n')
    .replaceAll('\\,', ',');

const event = (ics: string, uid: string) => {
  const start = ics.indexOf(`UID:${uid}`);
  return ics.slice(start, ics.indexOf('END:VEVENT', start));
};

describe('regional feeds', () => {
  beforeEach(async () => {
    await initI18n('pt-PT');
  });

  it('names one file per zone and language', () => {
    expect(feedPath('LC', 'pt-PT')).toBe('calendarios/zona-lc.ics');
    expect(feedPath('SU', 'en')).toBe('calendarios/zona-su.en.ics');
  });

  it('builds the Google, webcal and https subscription links', () => {
    expect(subscribeLinks('https://lunario.example', 'calendarios/zona-lc.ics')).toEqual({
      https: 'https://lunario.example/calendarios/zona-lc.ics',
      webcal: 'webcal://lunario.example/calendarios/zona-lc.ics',
      google:
        'https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Flunario.example%2Fcalendarios%2Fzona-lc.ics',
    });
  });

  it('has one all-day event at the start of every fortnight, with stable ids', () => {
    const ics = feed('LC');
    expect(ics).toContain('X-WR-CALNAME:Lunário · Litoral Centro');
    const starts = [...ics.matchAll(/DTSTART;VALUE=DATE:(\d+)/g)].map((m) => m[1]);
    expect(starts).toHaveLength(48);
    expect(starts.slice(0, 3)).toEqual(['20260101', '20260116', '20260201']);
    expect(starts.at(-1)).toBe('20271216');
    expect(ics).toContain('UID:zona-lc-2026-22@lunario');
    expect(ics).not.toContain('VALARM');
  });

  it("lists the fortnight's work, like the card on the Hoje screen", () => {
    const nov = event(feed('LC'), 'zona-lc-2026-21@lunario');
    expect(nov).toContain('SUMMARY:🌱 Na horta: 1–15 de novembro');
    expect(nov).toContain('1–15 de novembro · Litoral Centro');
    expect(nov).toContain('Semear em viveiro: Cebola.');
    expect(nov).toContain(
      'Semear diretamente: Ervilha, Espinafre – última quinzena, Fava, Nabo / nabiça / grelos.',
    );
    expect(nov).toContain('Plantar: Alho, Morango.');
    expect(nov).toContain('Mais em https://lunario.example/');
  });

  it('numbers the zone notes', () => {
    const june = event(feed('IN'), 'zona-in-2026-11@lunario');
    expect(june).toMatch(/Melão \((\d)\)/);
    const n = /Melão \((\d)\)/.exec(june)?.[1];
    expect(june).toContain(`(${String(n)}) Marginal no interior`);
  });

  it('is written in English for the English feed', () => {
    const ics = feed('LC', 'en');
    // en-GB puts thin spaces around the dash.
    expect(ics).toMatch(/SUMMARY:🌱 In the garden: 1\s?–\s?15 November/);
    expect(event(ics, 'zona-lc-2026-21@lunario')).toContain('Plant: Garlic, Strawberry.');
  });

  it('rejects an unknown zone', () => {
    expect(() => feed('XX' as 'LC')).toThrow('Unknown zone: XX');
  });
});
