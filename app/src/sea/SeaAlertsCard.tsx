import { Waves } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertDetails } from '../alerts/AlertDetails.tsx';
import { seaYellow, setSeaYellow } from '../alerts/push.ts';
import { useAlertToggle, type AlertCardProps } from '../alerts/useAlertToggle.ts';
import { WARNING_AREAS, type Port } from '../coast/ports.ts';

interface SeaAlertsCardProps extends Omit<AlertCardProps, 'seaArea'> {
  /** The sea port (automatic or chosen in Settings); its district is what the alerts follow. */
  port: Port;
}

/** RF-21: IPMA's sea agitation warnings for the port's district, by notification. */
export function SeaAlertsCard({ port, ...props }: SeaAlertsCardProps) {
  const { t } = useTranslation();
  const { state, busy, failed, toggle, run, context } = useAlertToggle('sea', {
    ...props,
    seaArea: port.warningArea,
  });
  const [yellow, setYellow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    seaYellow().then(
      (on) => !cancelled && setYellow(on),
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const changeYellow = async (on: boolean) => {
    setYellow(on);
    if (!(await run(() => setSeaYellow(on, context)))) setYellow(!on);
  };

  return (
    <article className="card" aria-labelledby="sea-alerts-heading">
      <h3 id="sea-alerts-heading">
        <Waves aria-hidden="true" size={20} />
        {t('seaAlerts.title')}
      </h3>
      <label className="toggle">
        <input
          type="checkbox"
          checked={state === 'on'}
          disabled={busy || state === 'loading' || state === 'unsupported'}
          onChange={(e) => void toggle(e.target.checked)}
        />
        {t('seaAlerts.toggle')}
      </label>
      {state === 'on' && (
        <label className="toggle">
          <input
            type="checkbox"
            checked={yellow}
            disabled={busy}
            onChange={(e) => void changeYellow(e.target.checked)}
          />
          {t('seaAlerts.yellow')}
        </label>
      )}
      <p role="status" className="hint">
        {failed
          ? t('alerts.failed')
          : state === 'on'
            ? t('seaAlerts.on', {
                port: port.name,
                district: WARNING_AREAS[port.warningArea] ?? port.warningArea,
              })
            : state === 'unsupported' || state === 'blocked'
              ? t(`alerts.${state}`)
              : ''}
      </p>
      <AlertDetails>
        <p>{t('seaAlerts.intro')}</p>
        <p>{t('seaAlerts.when')}</p>
        <p className="hint">{t('seaAlerts.privacy')}</p>
      </AlertDetails>
    </article>
  );
}
