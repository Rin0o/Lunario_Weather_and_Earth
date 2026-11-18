import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sayingFor } from '../almanac/almanac.ts';
import { dateInZone } from '../astro/time.ts';
import type { IsoDate } from '../calendar/dates.ts';
import { catalog } from '../catalog/catalog.ts';
import { SAYING_THEMES, type Catalog, type SayingTheme } from '../catalog/types.ts';
import { AlmanacSources } from '../components/AlmanacSources.tsx';
import { intlLocale } from '../i18n/format.ts';
import { LibraryNav } from './LibraryNav.tsx';
import { sayingsByMonth } from './sayings.ts';

interface SayingsLibraryProps {
  now: Date;
  source?: Catalog;
}

/**
 * Every saying in the catalogue, by month, with a search and a filter by theme. The months
 * start at the current one, open, with today's saying marked, and go round the year; a
 * search or a theme opens every month found.
 */
export function SayingsLibrary({ now, source = catalog }: SayingsLibraryProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const en = lang === 'en';
  const [query, setQuery] = useState('');
  const [theme, setTheme] = useState<SayingTheme | null>(null);

  const today = dateInZone(now) as IsoDate;
  const currentMonth = Number(today.slice(5, 7));
  const todays = useMemo(() => sayingFor(today, source), [today, source]);
  const months = useMemo(
    () => sayingsByMonth(source.sayings, { query, theme }, currentMonth),
    [source, query, theme, currentMonth],
  );
  const found = months.reduce((n, m) => n + m.sayings.length, 0);
  const filtered = query.trim() !== '' || theme !== null;

  const locale = intlLocale(lang);
  const monthName = (month: number) => {
    const name = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(
      Date.UTC(2000, month - 1, 1),
    );
    return name.charAt(0).toUpperCase() + name.slice(1);
  };
  const dayName = (month: number, day: number) =>
    new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
      Date.UTC(2000, month - 1, day),
    );

  const themeButton = (value: SayingTheme | null, label: string) => (
    <button
      key={value ?? 'all'}
      type="button"
      className="theme-chip"
      aria-pressed={theme === value}
      onClick={() => setTheme(value)}
    >
      {label}
    </button>
  );

  return (
    <section aria-labelledby="sayings-heading" className="page">
      <LibraryNav current="sayings" />
      <h2 id="sayings-heading">{t('sayings.title')}</h2>
      <div className="sayings-filters">
        <input
          type="search"
          className="sayings-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={t('sayings.search')}
          placeholder={t('sayings.searchPlaceholder')}
          autoComplete="off"
          enterKeyHint="search"
        />
        <div className="theme-chips" role="group" aria-label={t('sayings.themesLabel')}>
          {themeButton(null, t('sayings.allThemes'))}
          {SAYING_THEMES.map((value) => themeButton(value, t(`sayings.themes.${value}`)))}
        </div>
      </div>
      <p className="hint sayings-count" aria-live="polite">
        {found === 0 ? t('sayings.none') : t('sayings.count', { count: found })}
      </p>
      {months.map(({ month, sayings }) => (
        <details
          // A search or a theme opens every month found; clearing it goes back to this month.
          key={`${String(month)}-${filtered ? 'found' : 'all'}`}
          className="sayings-month"
          open={filtered || month === currentMonth}
        >
          <summary>
            <span>{monthName(month)}</span>
            <span className="hint month-count">{sayings.length}</span>
            <ChevronDown className="month-chevron" aria-hidden="true" size={20} />
          </summary>
          <ul className="sayings-list">
            {sayings.map((saying) => {
              const isToday = saying === todays;
              const meta = [
                saying.day === null ? null : dayName(saying.month, saying.day),
                saying.themes.map((th) => t(`sayings.themes.${th}`)).join(' · '),
              ].filter(Boolean);
              return (
                <li key={saying.text} className={isToday ? 'today' : undefined}>
                  {isToday && <p className="saying-today">{t('sayings.today')}</p>}
                  <figure className="saying">
                    <blockquote lang="pt-PT">{saying.text}</blockquote>
                    {en && <figcaption>{saying.meaning}</figcaption>}
                  </figure>
                  <p className="saying-meta">{meta.join(' — ')}</p>
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
