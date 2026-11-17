import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BackButton } from '../navigation/BackButton.tsx';

interface AlertsPageProps {
  /** The alert cards: frost alerts today (RF-14), others later. */
  children: ReactNode;
}

/** "Alertas": the notifications the phone can receive with the app closed. */
export function AlertsPage({ children }: AlertsPageProps) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="alerts-heading" className="page">
      <BackButton fallback={{ name: 'today' }} />
      <h2 id="alerts-heading">{t('alerts.title')}</h2>
      <p className="hint">{t('alerts.intro')}</p>
      {children}
    </section>
  );
}
