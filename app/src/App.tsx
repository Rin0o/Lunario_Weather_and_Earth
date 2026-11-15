import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './components/LanguageSwitcher.tsx';

export function App() {
  const { t } = useTranslation();

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
        <section aria-labelledby="today-heading">
          <h2 id="today-heading">{t('today.title')}</h2>
          <p>{t('today.comingSoon')}</p>
        </section>
      </main>
      <footer className="app-footer">
        <small>{t('app.version', { version: __APP_VERSION__ })}</small>
      </footer>
    </>
  );
}
