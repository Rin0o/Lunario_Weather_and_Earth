import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Crop, Text } from '../catalog/types.ts';
import { isoDateToNoonUtc, type IsoDate } from '../calendar/dates.ts';
import { googleCalendarUrl } from '../calendar/ics.ts';
import { formatFullDate } from '../i18n/format.ts';
import { downloadFile } from '../lib/download.ts';
import { getMeta, setMeta } from './db.ts';
import type { Planting } from './plantings.ts';
import {
  DEFAULT_ALARM,
  normaliseAlarm,
  plantingEvents,
  plantingIcs,
  type PlantingEvent,
} from './reminders.ts';

interface CalendarPanelProps {
  planting: Planting;
  crop: Crop;
  today: IsoDate;
}

/** RF-13: "Adicionar ao calendário" for one planting, with the reminder time to choose. */
export function CalendarPanel({ planting, crop, today }: CalendarPanelProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const pick = (text: Text) => (lang === 'en' ? text.en : text.pt);
  const fullDate = (d: IsoDate) => formatFullDate(isoDateToNoonUtc(d), lang);

  const [daysBefore, setDaysBefore] = useState(String(DEFAULT_ALARM.daysBefore));
  const [time, setTime] = useState<string>(DEFAULT_ALARM.time);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getMeta('reminderDaysBefore'), getMeta('reminderTime')])
      .then(([days, savedTime]) => {
        if (cancelled) return;
        const alarm = normaliseAlarm(
          days ?? DEFAULT_ALARM.daysBefore,
          savedTime ?? DEFAULT_ALARM.time,
        );
        setDaysBefore(String(alarm.daysBefore));
        setTime(alarm.time);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const events = plantingEvents(planting, crop, today);
  if (crop.perennial) return null;

  const text = (event: PlantingEvent) => ({
    title: t(`calendar.${event.kind}`, { crop: pick(crop.name) }),
    description: t('calendar.description', {
      date: fullDate(planting.date),
      from: fullDate(event.date),
      to: fullDate(event.until),
    }),
  });

  const create = async () => {
    const alarm = normaliseAlarm(daysBefore, time);
    await Promise.all([
      setMeta('reminderDaysBefore', String(alarm.daysBefore)),
      setMeta('reminderTime', alarm.time),
    ]).catch(() => undefined);
    const ics = plantingIcs(planting, events, alarm, text);
    downloadFile(
      new File([ics], `lunario-${crop.id}-${planting.date}.ics`, { type: 'text/calendar' }),
    );
    setMessage(t('calendar.created'));
  };

  return (
    <details className="calendar-panel">
      <summary>{t('calendar.add')}</summary>
      {events.length === 0 ? (
        <p className="hint">{t('calendar.nothing')}</p>
      ) : (
        <div className="planting-form">
          <ul className="calendar-events" aria-label={t('calendar.events')}>
            {events.map((event) => (
              <li key={event.kind}>
                <strong>{text(event).title}</strong> · {fullDate(event.date)}
                <br />
                <a
                  href={googleCalendarUrl({ ...text(event), date: event.date })}
                  target="_blank"
                  rel="noopener"
                >
                  {t('calendar.google')}
                </a>
              </li>
            ))}
          </ul>
          <div className="alarm-fields">
            <label>
              {t('calendar.daysBefore')}
              <input
                type="number"
                min={0}
                max={30}
                value={daysBefore}
                onChange={(e) => setDaysBefore(e.target.value)}
              />
            </label>
            <label>
              {t('calendar.at')}
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
          </div>
          <button type="button" className="primary" onClick={() => void create()}>
            {t('calendar.create')}
          </button>
          <p role="status" className="hint">
            {message}
          </p>
        </div>
      )}
    </details>
  );
}
