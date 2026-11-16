import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { saintsOn, sayingFor } from '../almanac/almanac.ts';
import { dateInZone } from '../astro/time.ts';
import type { IsoDate } from '../calendar/dates.ts';

/** RF-08: the saint of the day and a traditional saying, as in a printed almanac. */
export function AlmanacCard({ now }: { now: Date }) {
  const { t, i18n } = useTranslation();
  const en = i18n.resolvedLanguage === 'en';
  const today = dateInZone(now) as IsoDate;

  const saints = useMemo(() => saintsOn(today), [today]);
  const saying = useMemo(() => sayingFor(today), [today]);

  return (
    <article className="card" aria-labelledby="almanac-heading">
      <h3 id="almanac-heading">{t('almanac.title')}</h3>
      {saints.length > 0 && (
        <dl className="facts">
          <dt>{t('almanac.saint')}</dt>
          <dd>{saints.map((s) => (en ? s.name.en : s.name.pt)).join(' · ')}</dd>
        </dl>
      )}
      {saying && (
        <figure className="saying">
          <blockquote lang="pt-PT">{saying.text}</blockquote>
          {en && <figcaption>{saying.meaning}</figcaption>}
        </figure>
      )}
      <p className="hint">
        {t('almanac.sources')}{' '}
        <a href="https://pt.wikipedia.org/wiki/Calend%C3%A1rio_Romano_Geral" rel="noopener">
          Wikipédia
        </a>
        {' · '}
        <a href="https://pt.wikiquote.org/wiki/Prov%C3%A9rbios_portugueses" rel="noopener">
          Wikiquote
        </a>
        {' · '}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.pt" rel="noopener license">
          CC BY-SA 4.0
        </a>
      </p>
    </article>
  );
}
