import { Snowflake } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AlertDetails } from '../alerts/AlertDetails.tsx';
import { useAlertToggle, type AlertCardProps } from '../alerts/useAlertToggle.ts';

/** RF-14: turn the evening frost notifications on or off, saying what leaves the phone. */
export function FrostAlertsCard(props: AlertCardProps) {
  const { t } = useTranslation();
  const { state, busy, failed, toggle } = useAlertToggle('frost', props);

  return (
    <article className="card" aria-labelledby="frost-alerts-heading">
      <h3 id="frost-alerts-heading">
        <Snowflake aria-hidden="true" size={20} />
        {t('frostAlerts.title')}
      </h3>
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
          ? t('alerts.failed')
          : state === 'on'
            ? t('frostAlerts.on', { place: props.location.name })
            : state === 'unsupported' || state === 'blocked'
              ? t(`alerts.${state}`)
              : ''}
      </p>
      <AlertDetails>
        <p>{t('frostAlerts.intro')}</p>
        <p>{t('frostAlerts.when')}</p>
        <p className="hint">{t('frostAlerts.privacy')}</p>
      </AlertDetails>
    </article>
  );
}
