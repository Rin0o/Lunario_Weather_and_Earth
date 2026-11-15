import { addDays, buildIcs, type IcsEvent, type IsoDate } from '../src/calendar/ics.ts';

/** Path of the sample regional feed, generated at build time (see vite.config.ts). */
export const TEST_FEED_PATH = 'teste-calendario/zona-teste.ics';

const SAMPLE_FORTNIGHTS = [
  'Semear: alho, cebola, fava, ervilha',
  'Transplantar: couves, alface de inverno',
  'Semear em viveiro: alface, couve-flor',
  'Plantar: morangueiro, cebola',
  'Colher: couves, nabiças, alho-francês',
  'Semear: espinafre, rabanete, cenoura',
];

/**
 * Sample regional calendar (RF-12) for the Q-09 phone test: six fortnight events starting
 * on the build date, so the feed always shows upcoming events while the test runs.
 */
export function buildTestFeed(today: IsoDate, now = new Date()): string {
  const events: IcsEvent[] = SAMPLE_FORTNIGHTS.map((title, i) => ({
    uid: `teste-zona-${i}@lunario`,
    title: `🌱 ${title}`,
    date: addDays(today, i * 15),
    days: 15,
    description: 'Calendário de teste do Lunário (Litoral Centro). Pode remover depois do teste.',
  }));
  return buildIcs({ name: 'Lunário (teste)', events, now });
}
