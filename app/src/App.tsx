import {
  Bell,
  CalendarDays,
  LibraryBig,
  MoonStar,
  Waves,
  Settings,
  Sprout,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AboutPage } from './about/AboutPage.tsx';
import { AlertsPage } from './alerts/AlertsPage.tsx';
import { artwork } from './assets/artwork.ts';
import { catalog } from './catalog/catalog.ts';
import { Cover } from './components/Cover.tsx';
import { CropSheet } from './crops/CropSheet.tsx';
import { CropsList } from './crops/CropsList.tsx';
import { syncAlerts } from './alerts/push.ts';
import { FrostAlertsCard } from './frost/FrostAlertsCard.tsx';
import { FrostCard } from './frost/FrostCard.tsx';
import { DEFAULT_LANGUAGE, isSupportedLanguage } from './i18n/language.ts';
import { GardenPage } from './garden/GardenPage.tsx';
import { HolidaysLibrary } from './library/HolidaysLibrary.tsx';
import { MoonLibrary } from './library/MoonLibrary.tsx';
import { SaintsLibrary } from './library/SaintsLibrary.tsx';
import { SayingsLibrary } from './library/SayingsLibrary.tsx';
import { LocationChip } from './location/LocationChip.tsx';
import { LocationPicker } from './location/LocationPicker.tsx';
import { DISTRICTS } from './location/locations.ts';
import { useUserLocation } from './location/userLocation.ts';
import {
  PreviousRouteContext,
  hashOf,
  href,
  inLibrary,
  useNavigation,
} from './navigation/route.ts';
import { usePageTurn, useSwipeTabs } from './navigation/swipe.ts';
import { PortPicker } from './coast/PortPicker.tsx';
import { useSeaPort } from './coast/useSeaPort.ts';
import { SeaAlertsCard } from './sea/SeaAlertsCard.tsx';
import { SeaPage } from './sea/SeaPage.tsx';
import { SettingsPage } from './settings/SettingsPage.tsx';
import { SkyPage } from './sky/SkyPage.tsx';
import { SowingCard } from './today/SowingCard.tsx';
import { Today } from './today/Today.tsx';
import { useNow } from './today/useNow.ts';
import { WeatherCard } from './weather/WeatherCard.tsx';

export function App() {
  const { t, i18n } = useTranslation();
  const now = useNow();
  const [location, setLocation] = useUserLocation();
  const [seaPort, setSeaPort] = useSeaPort(location);
  const { route, previous } = useNavigation();
  const mainRef = useRef<HTMLElement>(null);
  useSwipeTabs(mainRef, route);
  const turn = usePageTurn(route);
  const district = DISTRICTS[location.district] ?? '';
  const resolved = i18n.resolvedLanguage ?? '';
  const language = isSupportedLanguage(resolved) ? resolved : DEFAULT_LANGUAGE;

  // RF-14, RF-21: keep the alerts in step with the location, sea port, language and garden.
  // Runs on start and on every page change (so garden edits count); sends nothing if nothing
  // changed.
  const seaArea = seaPort.port.warningArea;
  useEffect(() => {
    void syncAlerts({ location, seaArea, language, source: catalog }).catch(() => undefined);
  }, [location, seaArea, language, route.name]);

  const navLink = (to: string, label: string, Icon: LucideIcon, active: boolean) => (
    <a href={to} aria-current={active ? 'page' : undefined}>
      <Icon aria-hidden="true" size={22} strokeWidth={active ? 2.25 : 1.75} />
      <span>{label}</span>
    </a>
  );
  const locationControl = <LocationChip location={location} />;

  return (
    <>
      <header className="app-header">
        <div className="brand">
          <img
            src={artwork.logoRound.src}
            srcSet={artwork.logoRound.srcSet}
            sizes="56px"
            alt=""
            width={56}
            height={56}
          />
          <div>
            <h1>{t('app.name')}</h1>
            <p className="tagline">{t('app.tagline')}</p>
          </div>
        </div>
        <div className="header-tools">
          <a
            className="icon-button header-link"
            href={href.alerts}
            aria-label={t('nav.alerts')}
            title={t('nav.alerts')}
            aria-current={route.name === 'alerts' ? 'page' : undefined}
          >
            <Bell aria-hidden="true" size={20} />
          </a>
          <a
            className="icon-button header-link"
            href={href.settings}
            aria-label={t('nav.settings')}
            title={t('nav.settings')}
            aria-current={route.name === 'settings' || route.name === 'about' ? 'page' : undefined}
          >
            <Settings aria-hidden="true" size={20} />
          </a>
        </div>
      </header>
      <main ref={mainRef}>
        <PreviousRouteContext.Provider value={previous}>
          <div key={hashOf(route)} className={turn ? `page-turn turn-${turn}` : undefined}>
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
            {route.name === 'settings' && (
              <SettingsPage
                locationControl={<LocationPicker location={location} onChange={setLocation} />}
                portControl={
                  <PortPicker location={location} seaPort={seaPort} onChange={setSeaPort} />
                }
              />
            )}
            {route.name === 'about' && <AboutPage />}
            {route.name === 'alerts' && (
              <AlertsPage>
                <FrostAlertsCard location={location} seaArea={seaArea} />
                <SeaAlertsCard location={location} port={seaPort.port} />
              </AlertsPage>
            )}
            {route.name === 'sky' && (
              <SkyPage now={now} location={location} locationControl={locationControl} />
            )}
            {route.name === 'sea' && <SeaPage now={now} seaPort={seaPort} />}
            {route.name === 'garden' && <GardenPage now={now} district={district} />}
            {route.name === 'crops' && <CropsList />}
            {route.name === 'crop' && <CropSheet cropId={route.id} now={now} district={district} />}
            {route.name === 'sayings' && <SayingsLibrary now={now} />}
            {route.name === 'saints' && <SaintsLibrary now={now} />}
            {route.name === 'holidays' && <HolidaysLibrary now={now} />}
            {route.name === 'moon' && <MoonLibrary now={now} />}
          </div>
        </PreviousRouteContext.Provider>
      </main>
      <footer className="app-footer">
        <small>{t('app.version', { version: __APP_VERSION__ })}</small>
      </footer>
      <Cover />
      <nav className="tab-bar" aria-label={t('nav.label')}>
        {navLink(href.today, t('nav.today'), CalendarDays, route.name === 'today')}
        {navLink(href.sky, t('nav.sky'), MoonStar, route.name === 'sky')}
        {navLink(href.sea, t('nav.sea'), Waves, route.name === 'sea')}
        {navLink(href.garden, t('nav.garden'), Sprout, route.name === 'garden')}
        {navLink(href.crops, t('nav.library'), LibraryBig, inLibrary(route))}
      </nav>
    </>
  );
}
