import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** The explanation of an alert card (what it does, when, what is sent), closed until tapped. */
export function AlertDetails({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <details className="alert-details">
      <summary>
        <span>{t('alerts.details')}</span>
        <ChevronDown className="alert-details-chevron" aria-hidden="true" size={18} />
      </summary>
      {children}
    </details>
  );
}
