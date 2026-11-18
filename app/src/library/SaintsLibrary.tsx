import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dateInZone } from '../astro/time.ts';
import type { IsoDate } from '../calendar/dates.ts';
import { catalog } from '../catalog/catalog.ts';
import type { Catalog, SaintOrigin } from '../catalog/types.ts';
import { AlmanacSources } from '../components/AlmanacSources.tsx';
import { intlLocale } from '../i18n/format.ts';
import { LibraryNav } from './LibraryNav.tsx';
import { saintsByMonth } from './saints.ts';

interface SaintsLibraryProps {
  now: Date;
  source?: Catalog;
}

/** The origins worth a filter of their own; the rest are the Church's general calendar. */
const ORIGIN_FILTERS: readonly SaintOrigin[] = ['portugal', 'popular'];

/**
 * Every saint in the catalogue, by month and day, with a search and a filter for the
 * Portuguese and the popular saints. Like the sayings, the months start at the current one,
 * open, with today marked; a day's own saying, when it has one, is shown under its saints.
 */
export function SaintsLibrary({ now, source = catalog }: SaintsLibraryProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const en = lang === 'en';
  const [query, setQuery] = useState('');
  const [origin, setOrigin] = useState<SaintOrigin | null>(null);

  const today = dateInZone(now) as IsoDate;
  const currentMonth = Number(today.slice(5, 7));
  const currentDay = Number(today.slice(8, 10));
  const months = useMemo(
    () => saintsByMonth(source.saints, { query, origin }, currentMonth),
    [source, query, origin, currentMonth],
  );
  const found = months.reduce((n, m) => n + m.count, 0);
  const filtered = query.trim() !== '' || origin !== null;

  const sayingOf = (month: number, day: number) =>
    source.sayings.find((s) => s.month === month && s.day === day);

  const locale = intlLocale(lang);
  const monthName = (month: number) => {
    const name = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(
      Date.UTC(2000, month - 1, 1),
    );
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const originButton = (value: SaintOrigin | null, label: string) => (
    <button
      key={value ?? 'all'}
      type="button"
      className="theme-chip"
      aria-pressed={origin === value}
      onClick={() => setOrigin(value)}
    >
      {label}
    </button>
  );

  return (
    <section aria-labelledby="saints-heading" className="page">
      <LibraryNav current="saints" />
      <h2 id="saints-heading">{t('saints.title')}</h2>
      <div className="sayings-filters">
        <input
          type="search"
          className="sayings-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={t('saints.search')}
          placeholder={t('saints.searchPlaceholder')}
          autoComplete="off"
          enterKeyHint="search"
        />
        <div className="theme-chips" role="group" aria-label={t('saints.originsLabel')}>
          {originButton(null, t('saints.allOrigins'))}
          {ORIGIN_FILTERS.map((value) => originButton(value, t(`saints.origins.${value}`)))}
        </div>
      </div>
      <p className="hint sayings-count" aria-live="polite">
        {found === 0 ? t('saints.none') : t('saints.count', { count: found })}
      </p>
      {months.map(({ month, days, count }) => (
        <details
          key={`${String(month)}-${filtered ? 'found' : 'all'}`}
          className="sayings-month"
          open={filtered || month === currentMonth}
        >
          <summary>
            <span>{monthName(month)}</span>
            <span className="hint month-count">{count}</span>
            <ChevronDown className="month-chevron" aria-hidden="true" size={20} />
          </summary>
          <ul className="sayings-list saints-list">
            {days.map(({ day, saints }) => {
              const isToday = month === currentMonth && day === currentDay;
              const saying = sayingOf(month, day);
              return (
                <li key={day} className={isToday ? 'today' : undefined}>
                  {isToday && <p className="saying-today">{t('saints.today')}</p>}
                  <div className="saint-day">
                    <span className="saint-date" aria-hidden="true">
                      {day}
                    </span>
                    <div>
                      <span className="visually-hidden">
                        {new Intl.DateTimeFormat(locale, {
                          day: 'numeric',
                          month: 'long',
                          timeZone: 'UTC',
                        }).format(Date.UTC(2000, month - 1, day))}
                        :{' '}
                      </span>
                      {saints.map((s) => (
                        <p key={s.name.pt} className="saint-name">
                          {en ? s.name.en : s.name.pt}
                          {s.origin !== 'geral' && (
                            <span className="saint-origin">{t(`saints.origins.${s.origin}`)}</span>
                          )}
                        </p>
                      ))}
                      {saying && (
                        <figure className="saying saint-saying">
                          <blockquote lang="pt-PT">{saying.text}</blockquote>
                          {en && <figcaption>{saying.meaning}</figcaption>}
                        </figure>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </details>
      ))}
      <AlmanacSources />
    </section>
  );
}
