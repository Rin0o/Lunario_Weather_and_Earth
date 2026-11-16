import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ALARM,
  expectedTransplant,
  normaliseAlarm,
  plantingEvents,
  plantingIcs,
} from './reminders.ts';

const tomato = { transplantDays: { min: 42, max: 56 }, cycleDays: { min: 120, max: 150 } };
const bean = { transplantDays: null, cycleDays: { min: 120, max: 150 } };
const strawberry = { transplantDays: null, cycleDays: null };

describe('reminders (RF-13, D-20)', () => {
  it('expects a transplant only for nursery sowings', () => {
    expect(expectedTransplant({ action: 'SV', date: '2026-11-16' }, tomato)).toEqual({
      from: '2026-12-28',
      to: '2027-01-11',
    });
    expect(expectedTransplant({ action: 'TR', date: '2026-11-16' }, tomato)).toBeNull();
    expect(expectedTransplant({ action: 'SV', date: '2026-11-16' }, bean)).toBeNull();
  });

  it('lists transplant and harvest events from today on', () => {
    expect(plantingEvents({ action: 'SV', date: '2026-11-16' }, tomato, '2026-11-16')).toEqual([
      { kind: 'transplant', date: '2026-12-28', until: '2027-01-11' },
      { kind: 'harvest', date: '2027-03-16', until: '2027-04-15' },
    ]);
    // A month later the transplant date has passed; only the harvest is left.
    expect(
      plantingEvents({ action: 'SV', date: '2026-11-16' }, tomato, '2027-01-05').map((e) => e.kind),
    ).toEqual(['harvest']);
    expect(plantingEvents({ action: 'SD', date: '2026-11-16' }, bean, '2026-11-16')).toHaveLength(
      1,
    );
    expect(plantingEvents({ action: 'PL', date: '2026-11-16' }, strawberry, '2026-11-16')).toEqual(
      [],
    );
  });

  it('normalises reminder settings, falling back to 5 days at 13:00', () => {
    expect(normaliseAlarm('3', '09:30')).toEqual({ daysBefore: 3, time: '09:30' });
    expect(normaliseAlarm(0, '00:00')).toEqual({ daysBefore: 0, time: '00:00' });
    expect(normaliseAlarm('-1', '25:00')).toEqual(DEFAULT_ALARM);
    expect(normaliseAlarm('2.5', '9:30')).toEqual(DEFAULT_ALARM);
    expect(normaliseAlarm(null, undefined)).toEqual(DEFAULT_ALARM);
  });

  it('builds one calendar file with stable ids and the chosen alarm', () => {
    const events = plantingEvents({ action: 'SV', date: '2026-11-16' }, tomato, '2026-11-16');
    const ics = plantingIcs({ id: 'abc' }, events, DEFAULT_ALARM, (e) => ({
      title: `${e.kind} tomate`,
      description: `até ${e.until}`,
    })).replace(/\r\n /g, '');
    expect(ics).toContain('UID:abc-transplant@lunario');
    expect(ics).toContain('UID:abc-harvest@lunario');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261228');
    expect(ics).toContain('DTSTART;VALUE=DATE:20270316');
    expect(ics).toContain('SUMMARY:transplant tomate');
    expect(ics).toContain('DESCRIPTION:até 2027-04-15');
    expect(ics.match(/TRIGGER:-P4DT11H/g)).toHaveLength(2);
  });
});
