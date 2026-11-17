import { Snowflake } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Location } from '../astro/location.ts';
import { catalog } from '../catalog/catalog.ts';
import type { Catalog } from '../catalog/types.ts';
import { DEFAULT_LANGUAGE, isSupportedLanguage } from '../i18n/language.ts';
import {
  browserPush,
  disableFrostAlerts,
  enableFrostAlerts,
  frostAlertsState,
  type AlertsState,
  type PushPlatform,
} from './alerts.ts';

interface FrostAlertsCardProps {
  location: Location;
  /** Injected in tests; default to the bundled catalogue, the browser and its fetch. */
  source?: Catalog;
  platform?: PushPlatform;
  fetchImpl?: typeof fetch;
}

/** RF-14: turn the evening frost notifications on or off, saying what leaves the phone. */
export function FrostAlertsCard({
  location,
  source = catalog,
  platform = browserPush,
  fetchImpl = fetch,
}: FrostAlertsCardProps) {
  const { t, i18n } = useTranslation();
  const resolved = i18n.resolvedLanguage ?? '';
  const language = isSupportedLanguage(resolved) ? resolved : DEFAULT_LANGUAGE;
  const [state, setState] = useState<AlertsState | 'loading'>('loading');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    frostAlertsState(platform).then(
      (s) => !cancelled && setState(s),
      () => !cancelled && setState('off'),
    );
    return () => {
      cancelled = true;
    };
  }, [platform]);

  const toggle = async (on: boolean) => {
    setBusy(true);
    setFailed(false);
    try {
      if (on) {
        setState(await enableFrostAlerts({ location, language, source, platform, fetchImpl }));
      } else {
        setState('off');
        await disableFrostAlerts({ platform, fetchImpl });
      }
    } catch {
      setState('off');
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="card" aria-labelledby="frost-alerts-heading">
      <h3 id="frost-alerts-heading">
        <Snowflake aria-hidden="true" size={20} />
        {t('frostAlerts.title')}
      </h3>
      <p>{t('frostAlerts.intro')}</p>
      <p className="hint">{t('frostAlerts.privacy')}</p>
      <label className="toggle">
        <input
          type="checkbox"
          checked={state === 'on'}
          disabled={busy || state === 'loading' || state === 'unsupported'}
          onChange={(e) => void toggle(e.target.checked)}
        />
        {t('frostAlerts.toggle')}
      </label>
      <p role="status" className="hint">
        {failed
          ? t('frostAlerts.failed')
          : state === 'on'
            ? t('frostAlerts.on', { place: location.name })
            : state === 'unsupported' || state === 'blocked'
              ? t(`frostAlerts.${state}`)
              : ''}
      </p>
    </article>
  );
}
