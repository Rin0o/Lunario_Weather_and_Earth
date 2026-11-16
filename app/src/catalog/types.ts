/**
 * Shape of `catalog.json`, generated from `/data` by `scripts/build-catalog.ts`.
 * Shared by the build script and the app; field meanings are documented in data/README.md.
 */

/** Bilingual text (D-13). */
export interface Text {
  pt: string;
  en: string;
}

/** SV sementeira em viveiro, SD sementeira direta, TR transplante, PL plantação, CO colheita. */
export const ACTIONS = ['SV', 'SD', 'TR', 'PL', 'CO'] as const;
export type Action = (typeof ACTIONS)[number];

export const ZONE_IDS = ['LN', 'LC', 'IN', 'SU'] as const;
export type ZoneId = (typeof ZONE_IDS)[number];

export const CLIMATE_CLASSES = ['fresca', 'neutra', 'quente'] as const;
export type ClimateClass = (typeof CLIMATE_CLASSES)[number];

export const EDIBLE_PARTS = ['folha', 'flor', 'raiz', 'fruto'] as const;
export type EdiblePart = (typeof EDIBLE_PARTS)[number];

/** Fortnight of the year: 1 = 1–15 January … 24 = 16–31 December. */
export type Fortnight = number;

export interface Zone {
  id: ZoneId;
  name: Text;
  /** District names, matching IPMA's districts. */
  districts: string[];
  climate: Text;
  frostRisk: Text;
}

export interface Crop {
  id: string;
  name: Text;
  scientificName: string;
  family: string;
  ediblePart: EdiblePart;
  climateClass: ClimateClass;
  /** Days from sowing or planting to harvest; null for perennials. */
  cycleDays: { min: number; max: number } | null;
  /** Days from nursery sowing to transplanting (D-20); null for crops not sown in trays. */
  transplantDays: { min: number; max: number } | null;
  perennial: boolean;
  /** Row × plant spacing in cm, e.g. `30×30`. */
  spacingCm: string;
  notes: Text;
}

export interface CalendarWindow {
  cropId: string;
  zoneId: ZoneId;
  action: Action;
  /** Inclusive; when end < start the window crosses the new year. */
  start: Fortnight;
  end: Fortnight;
  /** base: entered by hand (Litoral Centro); derived: by a rule; calculated: harvest from the cycle. */
  origin: 'base' | 'derived' | 'calculated';
  note?: Text;
}

export interface DerivationRule {
  zoneId: ZoneId;
  classes: ClimateClass[];
  season: 'primavera' | 'outono' | 'todas';
  actions: Action[];
  shiftStart: number;
  shiftEnd: number;
  reason: Text;
}

export interface LunarRule {
  part: EdiblePart | 'todas';
  actions: (Action | 'evitar')[];
  phase: Text;
  scope: Text | null;
  reason: Text;
}

export interface Catalog {
  zones: Zone[];
  crops: Crop[];
  windows: CalendarWindow[];
  rules: DerivationRule[];
  lunarRules: LunarRule[];
}
