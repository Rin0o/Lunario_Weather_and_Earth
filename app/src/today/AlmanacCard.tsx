import { ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { saintsOn, sayingFor } from '../almanac/almanac.ts';
import { dateInZone } from '../astro/time.ts';
import type { IsoDate } from '../calendar/dates.ts';
import { AlmanacSources } from '../components/AlmanacSources.tsx';
import { href } from '../navigation/route.ts';

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
      <AlmanacSources />
      <a className="more-link" href={href.sayings}>
        {t('almanac.allSayings')}
        <ChevronRight aria-hidden="true" size={18} />
      </a>
    </article>
  );
}
