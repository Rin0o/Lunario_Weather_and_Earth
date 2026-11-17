import { ChevronRight, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { href } from '../navigation/route.ts';
import type { UserLocation } from './userLocation.ts';

const placeName = (location: UserLocation, near: (name: string) => string) =>
  location.source === 'gps' ? near(location.name) : location.name;

/** The current place and how it was chosen (GPS, list or default), for the settings. */
export function LocationSummary({ location }: { location: UserLocation }) {
  const { t } = useTranslation();
  return (
    <>
      <MapPin className="location-pin" aria-hidden="true" size={22} />
      <span className="location-text">
        <strong>{placeName(location, (name) => t('location.near', { name }))}</strong>
        <small>{t(`location.sources.${location.source}`)}</small>
      </span>
    </>
  );
}

/**
 * On Hoje and Céu, next to the date: the current place, linking to the settings where it is
 * changed. Until one is chosen, it invites the user to choose.
 */
export function LocationChip({ location }: { location: UserLocation }) {
  const { t } = useTranslation();
  return (
    <a className="location-inline" href={href.settings} title={t('location.changeInSettings')}>
      <MapPin aria-hidden="true" size={16} />
      {placeName(location, (name) => t('location.near', { name }))}
      {location.source === 'default' && (
        <span className="location-choose"> · {t('location.chooseShort')}</span>
      )}
      <ChevronRight aria-hidden="true" size={14} />
    </a>
  );
}
