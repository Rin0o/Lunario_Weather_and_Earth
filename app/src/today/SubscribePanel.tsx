import { CalendarPlus, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { feedPath, subscribeLinks } from '../calendar/regionalFeed.ts';
import type { Zone } from '../catalog/types.ts';
import { Modal } from '../components/Modal.tsx';

interface SubscribePanelProps {
  zone: Zone;
  /** Where the feeds are served; the page's own origin outside tests. */
  origin?: string;
}

/** RF-12: subscribe to the zone's fortnightly calendar, from a window over the page. */
export function SubscribePanel({ zone, origin = window.location.origin }: SubscribePanelProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'pt-PT';
  const links = subscribeLinks(origin, feedPath(zone.id, lang));
  const zoneName = lang === 'en' ? zone.name.en : zone.name.pt;

  return (
    <>
      <button
        type="button"
        className="subscribe-link"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <CalendarPlus aria-hidden="true" size={18} />
        <span>{t('feed.subscribe')}</span>
        <ChevronRight className="subscribe-chevron" aria-hidden="true" size={18} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t('feed.subscribe')}>
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
      </Modal>
    </>
  );
}
