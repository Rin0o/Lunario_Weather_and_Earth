import {
  ACTIONS,
  CLIMATE_CLASSES,
  EDIBLE_PARTS,
  ZONE_IDS,
  type Action,
  type CalendarWindow,
  type Catalog,
  type ClimateClass,
  type Crop,
  type DerivationRule,
  type LunarRule,
  type Text,
  type Zone,
  type ZoneId,
} from '../../app/src/catalog/types.ts';
import { readTable, type CsvRow } from './csv.ts';
import {
  formatFortnight,
  harvestMask,
  maskToWindows,
  parseFortnight,
  shiftFortnight,
  windowMask,
} from './fortnights.ts';

/** The raw text of each file in /data. */
export interface DataFiles {
  zonas: string;
  culturas: string;
  janelas: string;
  regrasDerivacao: string;
  avisosZona: string;
  regrasLunares: string;
}

export const DATA_FILE_NAMES: Record<keyof DataFiles, string> = {
  zonas: 'zonas.csv',
  culturas: 'culturas.csv',
  janelas: 'janelas.csv',
  regrasDerivacao: 'regras-derivacao.csv',
  avisosZona: 'avisos-zona.csv',
  regrasLunares: 'regras-lunares.csv',
};

/** All IPMA mainland districts; every one must belong to exactly one zone. */
export const DISTRICT_NAMES = [
  'Aveiro',
  'Beja',
  'Braga',
  'Bragança',
  'Castelo Branco',
  'Coimbra',
  'Évora',
  'Faro',
  'Guarda',
  'Leiria',
  'Lisboa',
  'Portalegre',
  'Porto',
  'Santarém',
  'Setúbal',
  'Viana do Castelo',
  'Vila Real',
  'Viseu',
];

export const BASE_ZONE: ZoneId = 'LC';
const ESTABLISHMENT: readonly Action[] = ['SV', 'SD', 'PL'];

export class DataError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(`Invalid data in /data:\n  - ${problems.join('\n  - ')}`);
    this.problems = problems;
  }
}

/** Collects problems instead of stopping at the first, so one run reports them all. */
class Checker {
  readonly problems: string[] = [];
  private readonly file: string;
  constructor(file: string) {
    this.file = file;
  }

  fail(row: CsvRow | null, message: string): void {
    this.problems.push(`${this.file}${row ? `:${row.line}` : ''}: ${message}`);
  }

  text(row: CsvRow, column: string): string {
    const value = row.values[column] ?? '';
    if (!value) this.fail(row, `"${column}" is empty`);
    return value;
  }

  /** Both languages present, or both empty when `optional`. */
  bilingual(row: CsvRow, prefix: string, optional = false): Text | null {
    const pt = row.values[`${prefix}_pt`] ?? '';
    const en = row.values[`${prefix}_en`] ?? '';
    if (optional && !pt && !en) return null;
    if (!pt) this.fail(row, `"${prefix}_pt" is empty`);
    if (!en) this.fail(row, `"${prefix}_en" is empty (every text needs English, D-13)`);
    return { pt, en };
  }

  oneOf<T extends string>(row: CsvRow, column: string, allowed: readonly T[]): T {
    const value = row.values[column] ?? '';
    if (!(allowed as readonly string[]).includes(value)) {
      this.fail(row, `"${column}" is "${value}", expected one of ${allowed.join(', ')}`);
    }
    return value as T;
  }

  list<T extends string>(row: CsvRow, column: string, allowed: readonly T[], all?: string): T[] {
    const raw = row.values[column] ?? '';
    if (all && raw === all) return [...allowed];
    const items = raw.split(';').map((s) => s.trim());
    for (const item of items) {
      if (!(allowed as readonly string[]).includes(item)) {
        this.fail(row, `"${column}" contains "${item}", expected ${allowed.join(', ')}`);
      }
    }
    return items as T[];
  }

  int(row: CsvRow, column: string): number {
    const value = row.values[column] ?? '';
    const n = Number(value);
    if (!/^-?\d+$/.test(value))
      this.fail(row, `"${column}" is "${value}", expected a whole number`);
    return n;
  }

  fortnight(row: CsvRow, column: string): number {
    try {
      return parseFortnight(row.values[column] ?? '');
    } catch (e) {
      this.fail(row, `"${column}": ${(e as Error).message}`);
      return 1;
    }
  }
}

function parseZones(text: string, problems: string[]): Zone[] {
  const file = DATA_FILE_NAMES.zonas;
  const table = readTable(file, text, [
    'id',
    'nome_pt',
    'nome_en',
    'distritos',
    'clima_pt',
    'clima_en',
    'risco_geada_pt',
    'risco_geada_en',
  ]);
  const c = new Checker(file);
  const zones = table.rows.map((row) => ({
    id: c.oneOf(row, 'id', ZONE_IDS),
    name: c.bilingual(row, 'nome') as Text,
    districts: c.list(row, 'distritos', DISTRICT_NAMES),
    climate: c.bilingual(row, 'clima') as Text,
    frostRisk: c.bilingual(row, 'risco_geada') as Text,
  }));
  for (const id of ZONE_IDS) {
    if (zones.filter((z) => z.id === id).length !== 1) c.fail(null, `zone ${id} must appear once`);
  }
  for (const d of DISTRICT_NAMES) {
    const n = zones.filter((z) => z.districts.includes(d)).length;
    if (n !== 1) c.fail(null, `district ${d} is in ${n} zones; it must be in exactly one`);
  }
  problems.push(...c.problems);
  return zones;
}

function parseCrops(text: string, problems: string[]): Crop[] {
  const file = DATA_FILE_NAMES.culturas;
  const table = readTable(file, text, [
    'id',
    'nome_pt',
    'nome_en',
    'nome_cientifico',
    'familia',
    'parte_comestivel',
    'classe_climatica',
    'ciclo_dias_min',
    'ciclo_dias_max',
    'perene',
    'compasso_cm',
    'notas_pt',
    'notas_en',
    'dias_ate_transplante_min',
    'dias_ate_transplante_max',
  ]);
  const c = new Checker(file);
  const crops = table.rows.map((row): Crop => {
    const hasTransplant = Boolean(
      row.values.dias_ate_transplante_min || row.values.dias_ate_transplante_max,
    );
    let transplantDays: Crop['transplantDays'] = null;
    if (hasTransplant) {
      transplantDays = {
        min: c.int(row, 'dias_ate_transplante_min'),
        max: c.int(row, 'dias_ate_transplante_max'),
      };
      if (transplantDays.min <= 0 || transplantDays.min > transplantDays.max) {
        c.fail(
          row,
          `days to transplant ${transplantDays.min}–${transplantDays.max} must be positive with min ≤ max`,
        );
      }
    }
    const id = c.text(row, 'id');
    if (!/^[a-z][a-z_]*$/.test(id)) c.fail(row, `id "${id}" must be lower case letters and _`);
    const perennial = c.oneOf(row, 'perene', ['sim', 'nao'] as const) === 'sim';
    const hasCycle = Boolean(row.values.ciclo_dias_min || row.values.ciclo_dias_max);
    let cycleDays: Crop['cycleDays'] = null;
    if (perennial && hasCycle) c.fail(row, 'perennial crops have no cycle in days');
    if (!perennial) {
      cycleDays = { min: c.int(row, 'ciclo_dias_min'), max: c.int(row, 'ciclo_dias_max') };
      if (cycleDays.min <= 0 || cycleDays.min > cycleDays.max) {
        c.fail(row, `cycle ${cycleDays.min}–${cycleDays.max} must be positive with min ≤ max`);
      }
    }
    return {
      id,
      name: c.bilingual(row, 'nome') as Text,
      scientificName: c.text(row, 'nome_cientifico'),
      family: c.text(row, 'familia'),
      ediblePart: c.oneOf(row, 'parte_comestivel', EDIBLE_PARTS),
      climateClass: c.oneOf(row, 'classe_climatica', CLIMATE_CLASSES),
      cycleDays,
      transplantDays,
      perennial,
      spacingCm: c.text(row, 'compasso_cm'),
      notes: c.bilingual(row, 'notas') as Text,
    };
  });
  const ids = crops.map((cr) => cr.id);
  ids.filter((id, i) => ids.indexOf(id) !== i).forEach((id) => c.fail(null, `duplicate id ${id}`));
  problems.push(...c.problems);
  return crops;
}

function parseBaseWindows(text: string, crops: Crop[], problems: string[]): CalendarWindow[] {
  const file = DATA_FILE_NAMES.janelas;
  const table = readTable(file, text, [
    'cultura',
    'acao',
    'inicio',
    'fim',
    'observacoes_pt',
    'observacoes_en',
  ]);
  const c = new Checker(file);
  const byId = new Map(crops.map((cr) => [cr.id, cr]));
  const windows = table.rows.map((row): CalendarWindow => {
    const cropId = c.text(row, 'cultura');
    const crop = byId.get(cropId);
    if (!crop) c.fail(row, `unknown crop "${cropId}"`);
    const action = c.oneOf(row, 'acao', ACTIONS);
    if (action === 'CO' && crop && !crop.perennial) {
      c.fail(row, `harvest (CO) is calculated for ${cropId}; only perennial crops list it (D-19)`);
    }
    const note = c.bilingual(row, 'observacoes', true);
    return {
      cropId,
      zoneId: BASE_ZONE,
      action,
      start: c.fortnight(row, 'inicio'),
      end: c.fortnight(row, 'fim'),
      origin: 'base',
      ...(note ? { note } : {}),
    };
  });
  for (const crop of crops) {
    const own = windows.filter((w) => w.cropId === crop.id);
    if (!own.some((w) => ESTABLISHMENT.includes(w.action))) {
      c.fail(null, `${crop.id} has no sowing or planting window`);
    }
    if (crop.perennial && !own.some((w) => w.action === 'CO')) {
      c.fail(null, `perennial ${crop.id} needs a harvest (CO) window`);
    }
    // Transplant reminders (D-20) need the nursery time of every crop sown in trays.
    const sownInTrays = own.some((w) => w.action === 'SV');
    if (sownInTrays && !crop.transplantDays) {
      c.fail(null, `${crop.id} is sown in trays (SV) but has no dias_ate_transplante`);
    }
    if (!sownInTrays && crop.transplantDays) {
      c.fail(null, `${crop.id} has dias_ate_transplante but is never sown in trays (SV)`);
    }
  }
  problems.push(...c.problems);
  return windows;
}

function parseRules(text: string, problems: string[]): DerivationRule[] {
  const file = DATA_FILE_NAMES.regrasDerivacao;
  const table = readTable(file, text, [
    'zona',
    'classes',
    'epoca',
    'acoes',
    'ajuste_inicio',
    'ajuste_fim',
    'racional_pt',
    'racional_en',
  ]);
  const c = new Checker(file);
  const rules = table.rows.map((row): DerivationRule => ({
    zoneId: c.oneOf(row, 'zona', ZONE_IDS),
    classes: c.list(row, 'classes', CLIMATE_CLASSES, 'todas'),
    season: c.oneOf(row, 'epoca', ['primavera', 'outono', 'todas'] as const),
    actions: c.list(row, 'acoes', ACTIONS),
    shiftStart: c.int(row, 'ajuste_inicio'),
    shiftEnd: c.int(row, 'ajuste_fim'),
    reason: c.bilingual(row, 'racional') as Text,
  }));
  rules.forEach((r, i) => {
    if (r.zoneId === BASE_ZONE) c.fail(table.rows[i] ?? null, 'the base zone has no rules');
  });
  // Every combination must match at most one rule, or derivation would be ambiguous.
  for (const zoneId of ZONE_IDS) {
    for (const cls of CLIMATE_CLASSES) {
      for (const season of ['primavera', 'outono'] as const) {
        for (const action of ACTIONS) {
          const n = rules.filter((r) => ruleMatches(r, zoneId, cls, season, action)).length;
          if (n > 1) c.fail(null, `${n} rules match ${zoneId}/${cls}/${season}/${action}`);
        }
      }
    }
  }
  problems.push(...c.problems);
  return rules;
}

function parseZoneNotes(
  text: string,
  crops: Crop[],
  problems: string[],
): { cropId: string; zoneId: ZoneId; note: Text }[] {
  const file = DATA_FILE_NAMES.avisosZona;
  const table = readTable(file, text, ['cultura', 'zona', 'aviso_pt', 'aviso_en']);
  const c = new Checker(file);
  const notes = table.rows.map((row) => {
    const cropId = c.text(row, 'cultura');
    if (!crops.some((cr) => cr.id === cropId)) c.fail(row, `unknown crop "${cropId}"`);
    return {
      cropId,
      zoneId: c.oneOf(row, 'zona', ZONE_IDS),
      note: c.bilingual(row, 'aviso') as Text,
    };
  });
  problems.push(...c.problems);
  return notes;
}

function parseLunarRules(text: string, problems: string[]): LunarRule[] {
  const file = DATA_FILE_NAMES.regrasLunares;
  const table = readTable(file, text, [
    'parte',
    'acao',
    'fase_pt',
    'fase_en',
    'ambito_pt',
    'ambito_en',
    'justificacao_pt',
    'justificacao_en',
  ]);
  const c = new Checker(file);
  const rules = table.rows.map((row): LunarRule => ({
    part: c.oneOf(row, 'parte', [...EDIBLE_PARTS, 'todas'] as const),
    actions: c.list(row, 'acao', [...ACTIONS, 'evitar'] as const),
    phase: c.bilingual(row, 'fase') as Text,
    scope: c.bilingual(row, 'ambito', true),
    reason: c.bilingual(row, 'justificacao') as Text,
  }));
  problems.push(...c.problems);
  return rules;
}

/** Spring if the window starts January–June, autumn otherwise (as in the dataset). */
export function seasonOf(start: number): 'primavera' | 'outono' {
  return start <= 12 ? 'primavera' : 'outono';
}

function ruleMatches(
  rule: DerivationRule,
  zoneId: ZoneId,
  cls: ClimateClass,
  season: 'primavera' | 'outono',
  action: Action,
): boolean {
  return (
    rule.zoneId === zoneId &&
    rule.classes.includes(cls) &&
    (rule.season === 'todas' || rule.season === season) &&
    rule.actions.includes(action)
  );
}

/** Derives the other zones' windows from the base zone's (D-08). No matching rule: unchanged. */
export function deriveWindows(
  base: CalendarWindow[],
  crops: Crop[],
  rules: DerivationRule[],
): CalendarWindow[] {
  const byId = new Map(crops.map((c) => [c.id, c]));
  const derived: CalendarWindow[] = [];
  for (const zoneId of ZONE_IDS.filter((z) => z !== BASE_ZONE)) {
    for (const w of base) {
      const crop = byId.get(w.cropId);
      if (!crop) continue;
      const rule = rules.find((r) =>
        ruleMatches(r, zoneId, crop.climateClass, seasonOf(w.start), w.action),
      );
      // Base notes belong to Litoral Centro; other zones get their own from avisos-zona.csv.
      derived.push({
        cropId: w.cropId,
        zoneId,
        action: w.action,
        start: shiftFortnight(w.start, rule?.shiftStart ?? 0),
        end: shiftFortnight(w.end, rule?.shiftEnd ?? 0),
        origin: 'derived',
      });
    }
  }
  return derived;
}

/** Harvest windows from sowing/planting windows plus the crop's cycle (D-19), merged per zone. */
export function calculateHarvests(windows: CalendarWindow[], crops: Crop[]): CalendarWindow[] {
  const harvests: CalendarWindow[] = [];
  for (const crop of crops) {
    if (!crop.cycleDays) continue;
    for (const zoneId of ZONE_IDS) {
      const mask = Array<boolean>(24).fill(false);
      for (const w of windows) {
        if (w.cropId !== crop.id || w.zoneId !== zoneId || !ESTABLISHMENT.includes(w.action)) {
          continue;
        }
        harvestMask(w.start, w.end, crop.cycleDays).forEach((on, i) => {
          if (on) mask[i] = true;
        });
      }
      for (const [start, end] of maskToWindows(mask)) {
        harvests.push({ cropId: crop.id, zoneId, action: 'CO', start, end, origin: 'calculated' });
      }
    }
  }
  return harvests;
}

/** Agronomic sanity checks that should be looked at but do not stop the build. */
export function findWarnings(windows: CalendarWindow[], crops: Crop[]): string[] {
  const warnings: string[] = [];
  for (const crop of crops) {
    for (const zoneId of ZONE_IDS) {
      const own = windows.filter((w) => w.cropId === crop.id && w.zoneId === zoneId);
      for (const tr of own.filter((w) => w.action === 'TR')) {
        const sameStart = own.find((w) => w.action === 'SV' && w.start === tr.start);
        if (sameStart) {
          warnings.push(
            `${crop.id} in ${zoneId}: transplanting (${formatFortnight(tr.start)}) starts in the ` +
              `same fortnight as nursery sowing; seedlings would not be ready`,
          );
        }
      }
      const sv = own.filter((w) => w.action === 'SV');
      if (sv.length > 1) {
        const overlap = sv.some((a, i) =>
          sv
            .slice(i + 1)
            .some((b) =>
              windowMask(a.start, a.end).some((on, k) => on && windowMask(b.start, b.end)[k]),
            ),
        );
        if (overlap) warnings.push(`${crop.id} in ${zoneId}: nursery sowing windows overlap`);
      }
    }
  }
  return warnings;
}

/** Reads, validates and expands /data into the catalogue. Throws DataError listing every problem. */
export function buildCatalog(files: DataFiles): { catalog: Catalog; warnings: string[] } {
  const problems: string[] = [];
  const zones = parseZones(files.zonas, problems);
  const crops = parseCrops(files.culturas, problems);
  const base = parseBaseWindows(files.janelas, crops, problems);
  const rules = parseRules(files.regrasDerivacao, problems);
  const zoneNotes = parseZoneNotes(files.avisosZona, crops, problems);
  const lunarRules = parseLunarRules(files.regrasLunares, problems);
  if (problems.length) throw new DataError(problems);

  const established = [...base, ...deriveWindows(base, crops, rules)];
  const windows = [...established, ...calculateHarvests(established, crops)].map((w) => {
    const zoneNote = zoneNotes.find((n) => n.cropId === w.cropId && n.zoneId === w.zoneId);
    return zoneNote && !w.note ? { ...w, note: zoneNote.note } : w;
  });

  return {
    catalog: { zones, crops, windows, rules, lunarRules },
    warnings: findWarnings(windows, crops),
  };
}
