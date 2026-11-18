import { Anchor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Location } from '../astro/location.ts';
import { nearestPort, PORTS } from './ports.ts';
import type { SeaPort } from './useSeaPort.ts';

interface PortPickerProps {
  location: Pick<Location, 'latitude' | 'longitude'>;
  seaPort: SeaPort;
  /** A port id, or null for the nearest one. */
  onChange: (id: string | null) => void;
}

const AUTO = '';

/** In Settings: the port of the Sea screen, the nearest by default (D-35). */
export function PortPicker({ location, seaPort, onChange }: PortPickerProps) {
  const { t } = useTranslation();
  const nearest = nearestPort(location);
  return (
    <div className="location-settings">
      <p className="location-chip">
        <Anchor className="location-pin" aria-hidden="true" size={22} />
        <span className="location-text">
          <strong>{seaPort.port.name}</strong>
          <small>
            {seaPort.automatic
              ? t('sea.port.automatic', { km: Math.round(seaPort.distanceKm) })
              : t('sea.port.chosen')}
          </small>
        </span>
      </p>
      <label>
        {t('sea.port.choose')}
        <select
          value={seaPort.automatic ? AUTO : seaPort.port.id}
          onChange={(event) => onChange(event.target.value === AUTO ? null : event.target.value)}
        >
          <option value={AUTO}>{t('sea.port.nearest', { name: nearest.name })}</option>
          {PORTS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
