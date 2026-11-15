export interface Location {
  name: string;
  latitude: number;
  longitude: number;
}

/**
 * Used until the user's location is known (RF-04). Coimbra sits in the base zone
 * (Litoral Centro) of the sowing calendar.
 */
export const DEFAULT_LOCATION: Location = {
  name: 'Coimbra',
  latitude: 40.2033,
  longitude: -8.4103,
};
