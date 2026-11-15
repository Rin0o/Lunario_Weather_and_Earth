import { useTranslation } from 'react-i18next';
import { DEFAULT_LOCATION } from './astro/location.ts';
import { LanguageSwitcher } from './components/LanguageSwitcher.tsx';
import { Today } from './today/Today.tsx';
import { useNow } from './today/useNow.ts';

export function App() {
  const { t } = useTranslation();
  const now = useNow();

  return (
    <>
      <header className="app-header">
        <div>
          <h1>{t('app.name')}</h1>
          <p className="tagline">{t('app.tagline')}</p>
        </div>
        <LanguageSwitcher />
      </header>
      <main>
        <Today now={now} location={DEFAULT_LOCATION} />
      </main>
      <footer className="app-footer">
        <small>{t('app.version', { version: __APP_VERSION__ })}</small>
      </footer>
    </>
  );
}
