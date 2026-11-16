import { useTranslation } from 'react-i18next';
import { feedPath, subscribeLinks } from '../calendar/regionalFeed.ts';
import type { Zone } from '../catalog/types.ts';

interface SubscribePanelProps {
  zone: Zone;
  /** Where the feeds are served; the page's own origin outside tests. */
  origin?: string;
}

/** RF-12: subscribe to the zone's fortnightly calendar. */
export function SubscribePanel({ zone, origin = window.location.origin }: SubscribePanelProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'pt-PT';
  const links = subscribeLinks(origin, feedPath(zone.id, lang));
  const zoneName = lang === 'en' ? zone.name.en : zone.name.pt;

  return (
    <details className="calendar-panel">
      <summary>{t('feed.subscribe')}</summary>
      <p className="hint">{t('feed.intro', { zone: zoneName })}</p>
      <p>
        <a className="button primary" href={links.google} target="_blank" rel="noopener">
          {t('feed.google')}
        </a>
      </p>
      <p>
        <a href={links.webcal}>{t('feed.other')}</a>
      </p>
      <p className="hint">
        {t('feed.address')}
        <br />
        <code className="feed-url">{links.https}</code>
      </p>
      <p className="hint">{t('feed.delay')}</p>
    </details>
  );
}
