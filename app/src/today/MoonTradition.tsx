import { useTranslation } from 'react-i18next';
import type { MoonPhaseName } from '../astro/moon.ts';
import { traditionFor } from '../astro/lunarTradition.ts';
import { catalog } from '../catalog/catalog.ts';
import type { Catalog, Text } from '../catalog/types.ts';

/** What lunar tradition says about today (RF-09). Always labelled as folklore (RNF-05). */
export function MoonTradition({
  phase,
  source = catalog,
}: {
  phase: MoonPhaseName;
  source?: Catalog;
}) {
  const { t, i18n } = useTranslation();
  const pick = (text: Text) => (i18n.resolvedLanguage === 'en' ? text.en : text.pt);
  const { period, favoured, avoid } = traditionFor(source.lunarRules, phase);

  return (
    <section className="tradition" aria-labelledby="tradition-heading">
      <h4 id="tradition-heading">
        {t('moonMode.title')} · {t('moonMode.period', { period: t(`moonMode.periods.${period}`) })}
      </h4>
      {avoid && (
        <p className="zone-note">
          {t('moonMode.avoidToday', { phase: t(`moonMode.periods.${period}`) })}{' '}
          {pick(avoid.advice)}.
        </p>
      )}
      {favoured.length > 0 ? (
        <>
          <p>{t('moonMode.favours')}</p>
          <ul>
            {favoured.map((rule) => (
              <li key={pick(rule.advice)}>
                {pick(rule.advice)}
                <span className="hint"> · {pick(rule.reason)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>{t('moonMode.nothing')}</p>
      )}
      <p className="hint">{t('moonMode.disclaimer')}</p>
    </section>
  );
}
