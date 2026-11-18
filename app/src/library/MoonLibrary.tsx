import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { moonPhasesOfYear, nextMoonQuarters, type YearPhase } from '../astro/moon.ts';
import { dateInZone, TIME_ZONE } from '../astro/time.ts';
import { daysBetween, type IsoDate } from '../calendar/dates.ts';
import { formatRelativeDays, formatTime, intlLocale } from '../i18n/format.ts';
import { moonIcon } from '../weather/icons.ts';
import { LibraryNav } from './LibraryNav.tsx';

/** The years the switcher reaches, as on the holidays shelf. */
const YEARS_AROUND = 10;

/**
 * The Moon's principal phases of a year, month by month, with the time in Portugal, the blue
 * moons and the lunar eclipses marked. Opens on the current year with the next phase marked.
 */
export function MoonLibrary({ now }: { now: Date }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const locale = intlLocale(lang);
  const today = dateInZone(now) as IsoDate;
  const thisYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(thisYear);

  const phases = useMemo(() => moonPhasesOfYear(year), [year]);
  const nextTime = useMemo(() => nextMoonQuarters(now, 1)[0]?.time.getTime(), [now]);
  const months = useMemo(() => {
    const byMonth = new Map<number, YearPhase[]>();
    for (const p of phases) {
      const month = Number(p.date.slice(5, 7));
      byMonth.set(month, [...(byMonth.get(month) ?? []), p]);
    }
    return [...byMonth];
  }, [phases]);

  const fulls = phases.filter((p) => p.phase === 'full').length;
  const blueMoons = phases.filter((p) => p.blueMoon).length;
  const eclipses = phases.filter((p) => p.eclipse).length;

  const format = (moment: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone: TIME_ZONE }).format(moment);
  const monthName = (month: number) =>
    new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(
      new Date(Date.UTC(year, month - 1, 15)),
    );

  const yearButton = (to: number, label: string, Icon: typeof ChevronLeft) => (
    <button
      type="button"
      className="year-step"
      onClick={() => setYear(to)}
      disabled={Math.abs(to - thisYear) > YEARS_AROUND}
      aria-label={label}
    >
      <Icon aria-hidden="true" size={22} />
    </button>
  );

  return (
    <section aria-labelledby="moon-library-heading" className="page">
      <LibraryNav current="moon" />
      <h2 id="moon-library-heading">{t('moonLibrary.title')}</h2>
      <div className="year-switcher">
        {yearButton(year - 1, t('holidays.previousYear'), ChevronLeft)}
        <p className="year-label" aria-live="polite">
          {year}
        </p>
        {yearButton(year + 1, t('holidays.nextYear'), ChevronRight)}
      </div>
      {year !== thisYear && (
        <p className="year-back">
          <button type="button" className="theme-chip" onClick={() => setYear(thisYear)}>
            {t('holidays.backToThisYear', { year: thisYear })}
          </button>
        </p>
      )}
      <p className="hint sayings-count">
        {[
          t('moonLibrary.fulls', { count: fulls }),
          blueMoons > 0 && t('moonLibrary.blueMoons', { count: blueMoons }),
          eclipses > 0 && t('moonLibrary.eclipses', { count: eclipses }),
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      {months.map(([month, list]) => (
        <section key={month} className="moon-month" aria-labelledby={`moon-month-${month}`}>
          <h3 id={`moon-month-${month}`}>{monthName(month)}</h3>
          <ul className="holiday-list moon-phase-list">
            {list.map((p) => {
              const isToday = p.date === today;
              const isNext = !isToday && p.time.getTime() === nextTime;
              const mark = isToday
                ? 'today'
                : isNext
                  ? 'next'
                  : p.date < today
                    ? 'past'
                    : undefined;
              const tags = [
                p.blueMoon ? t('moonLibrary.blueMoon') : null,
                p.eclipse ? t(`moonLibrary.eclipse.${p.eclipse}`) : null,
              ].filter(Boolean);
              return (
                <li key={p.time.toISOString()} data-mark={mark} data-phase={p.phase}>
                  <span className="holiday-date" aria-hidden="true">
                    <strong>{format(p.time, { day: 'numeric' })}</strong>
                    {format(p.time, { weekday: 'short' }).replace('.', '')}
                  </span>
                  <img className="moon-phase-disc moon-disc" src={moonIcon(p.phase)} alt="" />
                  <div>
                    {isToday && <p className="saying-today">{t('holidays.todayMark')}</p>}
                    {isNext && (
                      <p className="saying-today">
                        {t('moonLibrary.nextMark', {
                          when: formatRelativeDays(daysBetween(today, p.date as IsoDate), lang),
                        })}
                      </p>
                    )}
                    <p className="holiday-name">{t(`moon.phases.${p.phase}`)}</p>
                    <p className="saying-meta">
                      <span className="visually-hidden">
                        {format(p.time, { weekday: 'long', day: 'numeric', month: 'long' })},{' '}
                      </span>
                      {t('moon.phaseAt', { time: formatTime(p.time, lang) })}
                      {tags.length > 0 && <span className="moon-tags"> — {tags.join(' · ')}</span>}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="hint holiday-note">{t('moonLibrary.note')}</p>
    </section>
  );
}
