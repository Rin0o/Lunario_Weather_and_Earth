import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DISTRICTS, findLocation, MAINLAND_LOCATIONS, nearestLocation } from './locations.ts';
import { fromIpma, type UserLocation } from './userLocation.ts';

/** Beyond this distance from every IPMA location we are probably outside mainland Portugal. */
const FAR_KM = 60;

type Status =
  | { kind: 'idle' }
  | { kind: 'locating' }
  | { kind: 'error'; key: 'denied' | 'unavailable' | 'unsupported' }
  | { kind: 'far'; name: string };

interface LocationPickerProps {
  location: UserLocation;
  onChange: (location: UserLocation) => void;
  /** Injected in tests. */
  geolocation?: Geolocation | undefined;
}

const byDistrict = Object.entries(DISTRICTS).map(([id, name]) => ({
  name,
  locations: MAINLAND_LOCATIONS.filter((l) => l.district === Number(id)),
}));

export function LocationPicker({
  location,
  onChange,
  geolocation = typeof navigator === 'undefined' ? undefined : navigator.geolocation,
}: LocationPickerProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const useGps = () => {
    if (!geolocation) {
      setStatus({ kind: 'error', key: 'unsupported' });
      return;
    }
    setStatus({ kind: 'locating' });
    geolocation.getCurrentPosition(
      ({ coords }) => {
        const { location: nearest, distanceKm } = nearestLocation(coords);
        onChange({
          ...fromIpma(nearest, 'gps'),
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setStatus(distanceKm > FAR_KM ? { kind: 'far', name: nearest.name } : { kind: 'idle' });
      },
      (error) =>
        setStatus({
          kind: 'error',
          key: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable',
        }),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60_000 },
    );
  };

  return (
    <details className="location-picker">
      <summary>
        <span aria-hidden="true">📍</span>{' '}
        {location.source === 'gps' ? t('location.near', { name: location.name }) : location.name}{' '}
        <span className="location-change">{t('location.change')}</span>
      </summary>

      <div className="location-panel">
        <button type="button" onClick={useGps} disabled={status.kind === 'locating'}>
          {status.kind === 'locating' ? t('location.locating') : t('location.useGps')}
        </button>

        <label>
          {t('location.chooseFromList')}
          <select
            value={location.source === 'gps' ? '' : String(location.ipmaId)}
            onChange={(event) => {
              const chosen = findLocation(Number(event.target.value));
              if (chosen) {
                onChange(fromIpma(chosen, 'manual'));
                setStatus({ kind: 'idle' });
              }
            }}
          >
            <option value="" disabled>
              {t('location.choose')}
            </option>
            {byDistrict.map((d) => (
              <optgroup key={d.name} label={d.name}>
                {d.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <p role="status" className="hint">
          {status.kind === 'error' && t(`location.errors.${status.key}`)}
          {status.kind === 'far' && t('location.far', { name: status.name })}
        </p>
      </div>
    </details>
  );
}
