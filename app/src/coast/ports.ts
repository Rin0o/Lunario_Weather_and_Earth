import type { Location } from '../astro/location.ts';

/**
 * Coastal places of mainland Portugal, north to south and then east along the Algarve
 * (D-35). Any screen that needs "the sea near the user" uses this list: the Sea screen takes
 * the nearest port (or the one chosen in Settings), its tides (`tideConstants.json`) and the
 * nearest IPMA coastal point of the sea forecast.
 *
 * Coordinates are just off the coast, where the forecast models have sea.
 */
export interface Port {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** IPMA `globalIdLocal` of the nearest coastal point of the sea forecast. */
  ipmaSeaId: number;
  /** IPMA warning area (`idAreaAviso`): the coastal district, for the sea agitation warnings. */
  warningArea: string;
}

/** IPMA coastal points of the sea forecast (api.ipma.pt/open-data/sea-locations.json). */
export const IPMA_SEA_POINTS = {
  viana: 1160926,
  porto: 1130826,
  figueira: 1060526,
  lisboa: 1111026,
  sines: 1151326,
  sagres: 1081526,
  faro: 1080526,
} as const;

const S = IPMA_SEA_POINTS;

const port = (
  id: string,
  name: string,
  latitude: number,
  longitude: number,
  ipmaSeaId: number,
  warningArea: string,
): Port => ({ id, name, latitude, longitude, ipmaSeaId, warningArea });

export const PORTS: readonly Port[] = [
  port('viana', 'Viana do Castelo', 41.69, -8.86, S.viana, 'VCT'),
  port('povoa', 'Póvoa de Varzim', 41.38, -8.78, S.porto, 'PTO'),
  port('leixoes', 'Leixões', 41.18, -8.72, S.porto, 'PTO'),
  port('aveiro', 'Aveiro', 40.64, -8.76, S.figueira, 'AVR'),
  port('figueira', 'Figueira da Foz', 40.15, -8.88, S.figueira, 'CBR'),
  port('nazare', 'Nazaré', 39.6, -9.09, S.figueira, 'LRA'),
  port('peniche', 'Peniche', 39.35, -9.39, S.lisboa, 'LRA'),
  port('ericeira', 'Ericeira', 38.96, -9.43, S.lisboa, 'LSB'),
  port('cascais', 'Cascais', 38.69, -9.42, S.lisboa, 'LSB'),
  port('sesimbra', 'Sesimbra', 38.43, -9.1, S.lisboa, 'STB'),
  port('sines', 'Sines', 37.95, -8.89, S.sines, 'STB'),
  port('sagres', 'Sagres', 37.0, -8.94, S.sagres, 'FAR'),
  port('lagos', 'Lagos', 37.1, -8.67, S.sagres, 'FAR'),
  port('portimao', 'Portimão', 37.11, -8.53, S.sagres, 'FAR'),
  port('faro', 'Faro', 36.96, -7.87, S.faro, 'FAR'),
  port('vrsa', 'Vila Real de Santo António', 37.16, -7.4, S.faro, 'FAR'),
];

/** The coastal districts of the ports, by IPMA warning area, with their names. */
export const WARNING_AREAS: Readonly<Record<string, string>> = {
  VCT: 'Viana do Castelo',
  PTO: 'Porto',
  AVR: 'Aveiro',
  CBR: 'Coimbra',
  LRA: 'Leiria',
  LSB: 'Lisboa',
  STB: 'Setúbal',
  FAR: 'Faro',
};

export const isWarningArea = (area: unknown): area is string =>
  typeof area === 'string' && Object.hasOwn(WARNING_AREAS, area);

const EARTH_KM = 6371;

/** Great-circle distance in km. */
export function distanceKm(
  a: Pick<Location, 'latitude' | 'longitude'>,
  b: Pick<Location, 'latitude' | 'longitude'>,
): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

export function findPort(id: string): Port | undefined {
  return PORTS.find((p) => p.id === id);
}

/** The port nearest to a place, however far inland (D-35). */
export function nearestPort(place: Pick<Location, 'latitude' | 'longitude'>): Port {
  let best = PORTS[0] as Port;
  let bestKm = Infinity;
  for (const port of PORTS) {
    const km = distanceKm(place, port);
    if (km < bestKm) {
      best = port;
      bestKm = km;
    }
  }
  return best;
}
