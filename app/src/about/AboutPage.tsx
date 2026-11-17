import { useTranslation } from 'react-i18next';
import { artwork } from '../assets/artwork.ts';
import { BackButton } from '../navigation/BackButton.tsx';

/** One credited work: what it is used for (translated), then its title, author, date and licence. */
interface Credit {
  /** Translation key under `about.uses`. */
  use: string;
  /** Title of the work or name of the source, as published (italic when `work`). */
  title: string;
  work?: boolean;
  by?: string;
  /** Where it was found, when not the author (a museum, Wikimedia Commons). */
  via?: string;
  licence: string;
  licenceUrl?: string;
  url?: string;
}

const PD = 'about.publicDomain';
const CC0 = { licence: 'CC0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' };
const CC_BY = { licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/' };
const CC_BY_SA = {
  licence: 'CC BY-SA 4.0',
  licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
};

/** The credits of CREDITS.md, in three groups. Keep the two in step. */
const GROUPS: { key: string; credits: Credit[] }[] = [
  {
    key: 'engravings',
    credits: [
      {
        use: 'crops',
        title: 'Les Plantes potagères',
        work: true,
        by: 'Vilmorin-Andrieux & Cie, 1883 · 1904',
        via: 'Wikimedia Commons',
        licence: PD,
      },
      {
        use: 'coriander',
        title: 'An Illustrated Flora of the Northern United States and Canada',
        work: true,
        by: 'N. L. Britton & A. Brown, 1913',
        via: 'Wikimedia Commons',
        licence: PD,
      },
      {
        use: 'moon',
        title: 'Full Moon',
        work: true,
        by: 'Claude Mellan, 1635',
        via: 'The Metropolitan Museum of Art',
        ...CC0,
      },
      {
        use: 'wateringCan',
        title: 'Watering can',
        work: true,
        by: 'Félix Leblanc, c. 1850',
        via: 'The Metropolitan Museum of Art',
        ...CC0,
      },
    ],
  },
  {
    key: 'data',
    credits: [
      {
        use: 'weather',
        title: 'IPMA',
        by: 'Instituto Português do Mar e da Atmosfera',
        licence: 'about.attribution',
        url: 'https://api.ipma.pt',
      },
      { use: 'frost', title: 'Open-Meteo', url: 'https://open-meteo.com', ...CC_BY },
      {
        use: 'saints',
        title: 'Wikipédia',
        url: 'https://pt.wikipedia.org/wiki/Calend%C3%A1rio_Romano_Geral',
        ...CC_BY_SA,
      },
      {
        use: 'sayings',
        title: 'Wikiquote',
        url: 'https://pt.wikiquote.org/wiki/Prov%C3%A9rbios_portugueses',
        ...CC_BY_SA,
      },
      {
        use: 'astronomy',
        title: 'astronomy-engine',
        by: 'Don Cross',
        url: 'https://github.com/cosinekitty/astronomy',
        licence: 'MIT',
      },
    ],
  },
  {
    key: 'type',
    credits: [
      {
        use: 'weatherIcons',
        title: 'Meteocons',
        by: 'Bas Milius',
        url: 'https://github.com/basmilius/weather-icons',
        licence: 'MIT',
      },
      { use: 'interfaceIcons', title: 'Lucide', url: 'https://lucide.dev', licence: 'ISC' },
      {
        use: 'headings',
        title: 'IM Fell English',
        by: 'Igino Marini',
        url: 'https://fonts.google.com/specimen/IM+Fell+English',
        licence: 'OFL 1.1',
      },
    ],
  },
];

const REPOSITORY = 'https://github.com/Rin0o/Lunario_Weather_and_Earth';

/** "Sobre": the app's colophon, with every credited engraving, data source, icon set and typeface. */
export function AboutPage() {
  const { t } = useTranslation();
  const licenceText = (credit: Credit) =>
    credit.licence.startsWith('about.') ? t(credit.licence) : credit.licence;

  return (
    <section aria-labelledby="about-heading" className="page about">
      <BackButton fallback={{ name: 'settings' }} />
      <h2 id="about-heading">{t('about.title')}</h2>

      <header className="about-masthead">
        <img
          src={artwork.logoRound.src}
          srcSet={artwork.logoRound.srcSet}
          sizes="64px"
          alt=""
          width={64}
          height={64}
        />
        <div>
          <p className="about-name">{t('app.name')}</p>
          <p className="tagline">{t('app.tagline')}</p>
          <p className="hint">
            {t('app.version', { version: __APP_VERSION__ })} ·{' '}
            <a href={REPOSITORY} rel="noopener">
              {t('about.source')}
            </a>{' '}
            ({t('about.mit')})
          </p>
        </div>
      </header>

      {GROUPS.map((group) => (
        <article key={group.key} className="card" aria-labelledby={`about-${group.key}`}>
          <h3 id={`about-${group.key}`}>{t(`about.groups.${group.key}`)}</h3>
          <dl className="credits">
            {group.credits.map((credit) => (
              <div key={credit.use}>
                <dt>{t(`about.uses.${credit.use}`)}</dt>
                <dd>
                  {credit.url ? (
                    <a href={credit.url} rel="noopener">
                      {credit.title}
                    </a>
                  ) : credit.work ? (
                    <cite>{credit.title}</cite>
                  ) : (
                    credit.title
                  )}
                  {credit.by && <>, {credit.by}</>}
                  <span className="credit-meta">
                    {credit.via && <>{credit.via} · </>}
                    {credit.licenceUrl ? (
                      <a href={credit.licenceUrl} rel="noopener license">
                        {licenceText(credit)}
                      </a>
                    ) : (
                      licenceText(credit)
                    )}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </article>
      ))}

      <p className="hint about-own">{t('about.own')}</p>
    </section>
  );
}
