import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './components/LanguageSwitcher.tsx';
import { LocationPicker } from './location/LocationPicker.tsx';
import { useUserLocation } from './location/userLocation.ts';
import { Today } from './today/Today.tsx';
import { useNow } from './today/useNow.ts';
import { WeatherCard } from './weather/WeatherCard.tsx';

export function App() {
  const { t } = useTranslation();
  const now = useNow();
  const [location, setLocation] = useUserLocation();

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
        <Today
          now={now}
          location={location}
          locationControl={<LocationPicker location={location} onChange={setLocation} />}
          weather={<WeatherCard now={now} ipmaId={location.ipmaId} />}
        />
      </main>
      <footer className="app-footer">
        <small>{t('app.version', { version: __APP_VERSION__ })}</small>
      </footer>
    </>
  );
}
