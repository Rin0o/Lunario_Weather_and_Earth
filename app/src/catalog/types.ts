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
  /** Damaged by frost (RF-16): warn when frost is forecast while it is in the ground. */
  frostSensitive: boolean;
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
  /**
   * base: entered by hand (Litoral Centro); derived: by a rule; manual: entered by hand for
   * another zone, replacing the derived ones; calculated: harvest from the cycle.
   */
  origin: 'base' | 'derived' | 'manual' | 'calculated';
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

/**
 * Traditional lunar periods, as almanacs count them: each lasts from its principal phase to
 * the next (lua nova → quarto crescente → lua cheia → quarto minguante → lua nova).
 */
export const LUNAR_PERIODS = ['nova', 'crescente', 'cheia', 'minguante'] as const;
export type LunarPeriod = (typeof LUNAR_PERIODS)[number];

/** A traditional lunar rule (RF-09). Folklore, never agronomic advice (RNF-05). */
export interface LunarRule {
  part: EdiblePart | 'todas';
  actions: (Action | 'evitar')[];
  /** Periods the rule favours; for `evitar`, the phases whose exact day to avoid. */
  periods: LunarPeriod[];
  phase: Text;
  advice: Text;
  reason: Text;
}

/** geral: General Roman Calendar; portugal: Portugal's own calendar; popular: popular devotion. */
export const SAINT_ORIGINS = ['geral', 'portugal', 'popular'] as const;
export type SaintOrigin = (typeof SAINT_ORIGINS)[number];

/** A saint or feast on a fixed date (RF-08). A day may have several. */
export interface Saint {
  /** 1–12. */
  month: number;
  day: number;
  name: Text;
  origin: SaintOrigin;
}

/**
 * A traditional saying (RF-08). Sayings are not translated: English shows the meaning (D-13).
 * With a day, it belongs to that date (usually a saint's day); otherwise to the whole month.
 */
export interface Saying {
  month: number;
  day: number | null;
  text: string;
  meaning: string;
  /** What the saying is about, for the library's filter: one or two themes. */
  themes: SayingTheme[];
}

export const SAYING_THEMES = [
  'tempo',
  'ceu',
  'horta',
  'searas',
  'vinha',
  'animais',
  'festas',
] as const;
export type SayingTheme = (typeof SAYING_THEMES)[number];

export interface Catalog {
  zones: Zone[];
  crops: Crop[];
  windows: CalendarWindow[];
  rules: DerivationRule[];
  lunarRules: LunarRule[];
  saints: Saint[];
  sayings: Saying[];
}
