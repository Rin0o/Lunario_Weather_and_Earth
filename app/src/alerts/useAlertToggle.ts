import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Location } from '../astro/location.ts';
import { catalog } from '../catalog/catalog.ts';
import type { Catalog } from '../catalog/types.ts';
import { DEFAULT_LANGUAGE, isSupportedLanguage } from '../i18n/language.ts';
import {
  alertsState,
  browserPush,
  disableAlerts,
  enableAlerts,
  type AlertKind,
  type AlertsContext,
  type AlertsState,
  type PushPlatform,
} from './push.ts';

export interface AlertCardProps {
  location: Location;
  /** IPMA warning area of the sea port, sent while sea alerts are on. */
  seaArea: string;
  /** Injected in tests; default to the bundled catalogue, the browser and its fetch. */
  source?: Catalog;
  platform?: PushPlatform;
  fetchImpl?: typeof fetch;
}

/** The on/off switch of one kind of alerts, as the alert cards show it. */
export function useAlertToggle(
  kind: AlertKind,
  {
    location,
    seaArea,
    source = catalog,
    platform = browserPush,
    fetchImpl = fetch,
  }: AlertCardProps,
) {
  const { i18n } = useTranslation();
  const resolved = i18n.resolvedLanguage ?? '';
  const language = isSupportedLanguage(resolved) ? resolved : DEFAULT_LANGUAGE;
  const context: AlertsContext = {
    location,
    seaArea,
    language,
    source,
    platform,
    fetchImpl,
  };
  const [state, setState] = useState<AlertsState | 'loading'>('loading');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    alertsState(kind, platform).then(
      (s) => !cancelled && setState(s),
      () => !cancelled && setState('off'),
    );
    return () => {
      cancelled = true;
    };
  }, [kind, platform]);

  /** Runs a change, keeping the card busy meanwhile; false when it failed. */
  const run = async (change: () => Promise<void>): Promise<boolean> => {
    setBusy(true);
    setFailed(false);
    try {
      await change();
      return true;
    } catch {
      setFailed(true);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const toggle = (on: boolean) =>
    run(async () => {
      if (on) {
        try {
          setState(await enableAlerts(kind, context));
        } catch (error) {
          setState('off');
          throw error;
        }
      } else {
        setState('off');
        await disableAlerts(kind, context);
      }
    });

  return { state, busy, failed, toggle, run, context };
}
