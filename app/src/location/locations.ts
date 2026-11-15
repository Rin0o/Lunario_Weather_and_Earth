/**
 * IPMA forecast locations in mainland Portugal (api.ipma.pt/open-data/distrits-islands.json,
 * idRegiao = 1), bundled so the manual list and GPS matching work offline.
 * Madeira and the Azores are out of scope for v1.
 */
export interface IpmaLocation {
  /** IPMA `globalIdLocal`, used to request the forecast. */
  id: number;
  name: string;
  /** IPMA district number, 1–18. */
  district: number;
  latitude: number;
  longitude: number;
}

export const DISTRICTS: Record<number, string> = {
  1: 'Aveiro',
  2: 'Beja',
  3: 'Braga',
  4: 'Bragança',
  5: 'Castelo Branco',
  6: 'Coimbra',
  7: 'Évora',
  8: 'Faro',
  9: 'Guarda',
  10: 'Leiria',
  11: 'Lisboa',
  12: 'Portalegre',
  13: 'Porto',
  14: 'Santarém',
  15: 'Setúbal',
  16: 'Viana do Castelo',
  17: 'Vila Real',
  18: 'Viseu',
};

export const MAINLAND_LOCATIONS: readonly IpmaLocation[] = [
  { id: 1010500, name: 'Aveiro', district: 1, latitude: 40.6413, longitude: -8.6535 },
  { id: 1020500, name: 'Beja', district: 2, latitude: 38.02, longitude: -7.87 },
  { id: 1030300, name: 'Braga', district: 3, latitude: 41.5475, longitude: -8.4227 },
  { id: 1030800, name: 'Guimarães', district: 3, latitude: 41.4434, longitude: -8.2938 },
  { id: 1040200, name: 'Bragança', district: 4, latitude: 41.8076, longitude: -6.7606 },
  { id: 1050200, name: 'Castelo Branco', district: 5, latitude: 39.8217, longitude: -7.4957 },
  { id: 1060300, name: 'Coimbra', district: 6, latitude: 40.2081, longitude: -8.4194 },
  { id: 1070500, name: 'Évora', district: 7, latitude: 38.5701, longitude: -7.9104 },
  { id: 1080500, name: 'Faro', district: 8, latitude: 37.0146, longitude: -7.9331 },
  { id: 1080800, name: 'Loulé', district: 8, latitude: 37.1397, longitude: -8.0202 },
  { id: 1081100, name: 'Portimão', district: 8, latitude: 37.15, longitude: -8.52 },
  { id: 1081505, name: 'Sagres', district: 8, latitude: 37.0168, longitude: -8.9403 },
  { id: 1090700, name: 'Guarda', district: 9, latitude: 40.5379, longitude: -7.2647 },
  { id: 1090821, name: 'Penhas Douradas', district: 9, latitude: 40.4075, longitude: -7.5665 },
  { id: 1100900, name: 'Leiria', district: 10, latitude: 39.7473, longitude: -8.8069 },
  { id: 1110600, name: 'Lisboa', district: 11, latitude: 38.766, longitude: -9.1286 },
  { id: 1121400, name: 'Portalegre', district: 12, latitude: 39.29, longitude: -7.42 },
  { id: 1131200, name: 'Porto', district: 13, latitude: 41.158, longitude: -8.6294 },
  { id: 1141600, name: 'Santarém', district: 14, latitude: 39.2, longitude: -8.74 },
  { id: 1151200, name: 'Setúbal', district: 15, latitude: 38.5246, longitude: -8.8856 },
  { id: 1151300, name: 'Sines', district: 15, latitude: 37.956, longitude: -8.8643 },
  { id: 1160900, name: 'Viana do Castelo', district: 16, latitude: 41.6952, longitude: -8.8365 },
  { id: 1171400, name: 'Vila Real', district: 17, latitude: 41.3053, longitude: -7.744 },
  { id: 1182300, name: 'Viseu', district: 18, latitude: 40.6585, longitude: -7.912 },
];

export const COIMBRA = MAINLAND_LOCATIONS.find((l) => l.id === 1060300) as IpmaLocation;

/** Great-circle distance in km (haversine). */
export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const h =
    Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** The closest IPMA location to a point, and how far it is. */
export function nearestLocation(point: { latitude: number; longitude: number }): {
  location: IpmaLocation;
  distanceKm: number;
} {
  let best = { location: COIMBRA, distanceKm: Infinity };
  for (const location of MAINLAND_LOCATIONS) {
    const d = distanceKm(point, location);
    if (d < best.distanceKm) best = { location, distanceKm: d };
  }
  return best;
}

export function findLocation(id: number): IpmaLocation | undefined {
  return MAINLAND_LOCATIONS.find((l) => l.id === id);
}
