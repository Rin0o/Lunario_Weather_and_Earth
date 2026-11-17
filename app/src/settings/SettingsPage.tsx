import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { href } from '../navigation/route.ts';
import { BackButton } from '../navigation/BackButton.tsx';
import { LanguageSwitcher } from '../components/LanguageSwitcher.tsx';

interface SettingsPageProps {
  /** The location picker, always open (D-23). */
  locationControl?: ReactNode;
}

/** "Definições": the app's preferences (location, language), each saved on the device, and the way to "Sobre". */
export function SettingsPage({ locationControl }: SettingsPageProps) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="settings-heading" className="page">
      <BackButton fallback={{ name: 'today' }} />
      <h2 id="settings-heading">{t('settings.title')}</h2>
      {locationControl && (
        <article className="card" aria-labelledby="location-heading">
          <h3 id="location-heading">{t('location.title')}</h3>
          {locationControl}
        </article>
      )}
      <article className="card" aria-labelledby="language-heading">
        <h3 id="language-heading">{t('language.label')}</h3>
        <LanguageSwitcher />
      </article>
      <article className="card" aria-labelledby="about-link-heading">
        <h3 id="about-link-heading">{t('about.title')}</h3>
        <p className="hint">{t('about.summary')}</p>
        <a className="more-link" href={href.about}>
          {t('about.more')}
          <ChevronRight aria-hidden="true" size={18} />
        </a>
      </article>
    </section>
  );
}
