import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './components/LanguageSwitcher.tsx';
import { CropSheet } from './crops/CropSheet.tsx';
import { CropsList } from './crops/CropsList.tsx';
import { LocationPicker } from './location/LocationPicker.tsx';
import { DISTRICTS } from './location/locations.ts';
import { useUserLocation } from './location/userLocation.ts';
import { href, useRoute } from './navigation/route.ts';
import { SowingCard } from './today/SowingCard.tsx';
import { Today } from './today/Today.tsx';
import { useNow } from './today/useNow.ts';
import { WeatherCard } from './weather/WeatherCard.tsx';

export function App() {
  const { t } = useTranslation();
  const now = useNow();
  const [location, setLocation] = useUserLocation();
  const route = useRoute();
  const district = DISTRICTS[location.district] ?? '';

  const navLink = (to: string, label: string, active: boolean) => (
    <a href={to} aria-current={active ? 'page' : undefined}>
      {label}
    </a>
  );

  return (
    <>
      <header className="app-header">
        <div>
          <h1>{t('app.name')}</h1>
          <p className="tagline">{t('app.tagline')}</p>
        </div>
        <LanguageSwitcher />
      </header>
      <nav className="app-nav" aria-label={t('nav.label')}>
        {navLink(href.today, t('nav.today'), route.name === 'today')}
        {navLink(href.crops, t('nav.crops'), route.name !== 'today')}
      </nav>
      <main>
        {route.name === 'today' && (
          <Today
            now={now}
            location={location}
            locationControl={<LocationPicker location={location} onChange={setLocation} />}
            weather={<WeatherCard now={now} ipmaId={location.ipmaId} />}
            sowing={<SowingCard now={now} district={district} />}
          />
        )}
        {route.name === 'crops' && <CropsList />}
        {route.name === 'crop' && <CropSheet cropId={route.id} now={now} district={district} />}
      </main>
      <footer className="app-footer">
        <small>{t('app.version', { version: __APP_VERSION__ })}</small>
      </footer>
    </>
  );
}
