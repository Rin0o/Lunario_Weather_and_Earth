import { CalendarDays, Carrot, MoonStar, Sprout, type LucideIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { artwork } from './assets/artwork.ts';
import { catalog } from './catalog/catalog.ts';
import { Cover } from './components/Cover.tsx';
import { LanguageSwitcher } from './components/LanguageSwitcher.tsx';
import { CropSheet } from './crops/CropSheet.tsx';
import { CropsList } from './crops/CropsList.tsx';
import { syncFrostAlerts } from './frost/alerts.ts';
import { FrostAlertsCard } from './frost/FrostAlertsCard.tsx';
import { FrostCard } from './frost/FrostCard.tsx';
import { DEFAULT_LANGUAGE, isSupportedLanguage } from './i18n/language.ts';
import { GardenPage } from './garden/GardenPage.tsx';
import { LocationPicker } from './location/LocationPicker.tsx';
import { DISTRICTS } from './location/locations.ts';
import { useUserLocation } from './location/userLocation.ts';
import { href, useRoute } from './navigation/route.ts';
import { SkyPage } from './sky/SkyPage.tsx';
import { SowingCard } from './today/SowingCard.tsx';
import { Today } from './today/Today.tsx';
import { useNow } from './today/useNow.ts';
import { WeatherCard } from './weather/WeatherCard.tsx';

export function App() {
  const { t, i18n } = useTranslation();
  const now = useNow();
  const [location, setLocation] = useUserLocation();
  const route = useRoute();
  const district = DISTRICTS[location.district] ?? '';
  const resolved = i18n.resolvedLanguage ?? '';
  const language = isSupportedLanguage(resolved) ? resolved : DEFAULT_LANGUAGE;

  // RF-14: keep the frost alerts in step with the location, language and garden. Runs on
  // start and on every page change (so garden edits count); sends nothing if nothing changed.
  useEffect(() => {
    void syncFrostAlerts({ location, language, source: catalog }).catch(() => undefined);
  }, [location, language, route.name]);

  const navLink = (to: string, label: string, Icon: LucideIcon, active: boolean) => (
    <a href={to} aria-current={active ? 'page' : undefined}>
      <Icon aria-hidden="true" size={22} strokeWidth={active ? 2.25 : 1.75} />
      <span>{label}</span>
    </a>
  );
  const locationControl = <LocationPicker location={location} onChange={setLocation} />;

  return (
    <>
      <header className="app-header">
        <div className="brand">
          <img
            src={artwork.logoRound.src}
            srcSet={artwork.logoRound.srcSet}
            sizes="44px"
            alt=""
            width={44}
            height={44}
          />
          <div>
            <h1>{t('app.name')}</h1>
            <p className="tagline">{t('app.tagline')}</p>
          </div>
        </div>
        <LanguageSwitcher />
      </header>
      <main>
        {route.name === 'today' && (
          <Today
            now={now}
            location={location}
            locationControl={locationControl}
            frost={<FrostCard now={now} location={location} />}
            weather={<WeatherCard now={now} ipmaId={location.ipmaId} />}
            sowing={<SowingCard now={now} district={district} />}
          />
        )}
        {route.name === 'sky' && (
          <SkyPage now={now} location={location} locationControl={locationControl} />
        )}
        {route.name === 'garden' && (
          <GardenPage
            now={now}
            district={district}
            alerts={<FrostAlertsCard location={location} />}
          />
        )}
        {route.name === 'crops' && <CropsList />}
        {route.name === 'crop' && <CropSheet cropId={route.id} now={now} district={district} />}
      </main>
      <footer className="app-footer">
        <small>{t('app.version', { version: __APP_VERSION__ })}</small>
      </footer>
      <Cover />
      <nav className="tab-bar" aria-label={t('nav.label')}>
        {navLink(href.today, t('nav.today'), CalendarDays, route.name === 'today')}
        {navLink(href.sky, t('nav.sky'), MoonStar, route.name === 'sky')}
        {navLink(href.garden, t('nav.garden'), Sprout, route.name === 'garden')}
        {navLink(
          href.crops,
          t('nav.crops'),
          Carrot,
          route.name === 'crops' || route.name === 'crop',
        )}
      </nav>
    </>
  );
}
