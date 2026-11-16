// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCatalog, DATA_FILE_NAMES, DataError, type DataFiles } from './catalog.ts';
import { readTable } from './csv.ts';
import { formatFortnight, parseFortnight } from './fortnights.ts';

const root = new URL('../../', import.meta.url);
const realFiles = Object.fromEntries(
  Object.entries(DATA_FILE_NAMES).map(([key, name]) => [
    key,
    readFileSync(new URL(`data/${name}`, root), 'utf8'),
  ]),
) as unknown as DataFiles;

const { catalog, warnings } = buildCatalog(realFiles);
const key = (w: { cropId: string; zoneId: string; action: string; start: number; end: number }) =>
  `${w.cropId} ${w.zoneId} ${w.action} ${formatFortnight(w.start)}–${formatFortnight(w.end)}`;

describe('the real /data', () => {
  it('builds with the expected contents', () => {
    expect(catalog.crops).toHaveLength(35);
    expect(catalog.zones.map((z) => z.id)).toEqual(['LN', 'LC', 'IN', 'SU']);
    expect(catalog.windows.filter((w) => w.origin === 'base')).toHaveLength(69);
    expect(catalog.lunarRules).toHaveLength(8);
  });

  it('derives exactly the windows of the v0.1 spreadsheet for LN, IN and SU (D-08)', () => {
    const sheet = readTable(
      'janelas-folha-v0.1.csv',
      readFileSync(new URL('scripts/__fixtures__/janelas-folha-v0.1.csv', root), 'utf8'),
      ['cultura', 'zona', 'acao', 'inicio', 'fim'],
    ).rows.map(({ values: v }) =>
      key({
        cropId: v.cultura ?? '',
        zoneId: v.zona ?? '',
        action: v.acao ?? '',
        start: parseFortnight(v.inicio ?? ''),
        end: parseFortnight(v.fim ?? ''),
      }),
    );
    const derived = catalog.windows.filter((w) => w.origin === 'derived').map(key);
    expect(derived.sort()).toEqual(sheet.sort());
  });

  it('calculates harvests for every non-perennial crop in every zone (D-19)', () => {
    for (const crop of catalog.crops.filter((c) => !c.perennial)) {
      for (const zone of catalog.zones) {
        const harvests = catalog.windows.filter(
          (w) => w.cropId === crop.id && w.zoneId === zone.id && w.action === 'CO',
        );
        expect(harvests.length, `${crop.id} ${zone.id}`).toBeGreaterThan(0);
        expect(harvests.every((w) => w.origin === 'calculated')).toBe(true);
      }
    }
    const lettuceLC = catalog.windows.filter(
      (w) => w.cropId === 'alface' && w.zoneId === 'LC' && w.action === 'CO',
    );
    expect(lettuceLC.map(key)).toEqual(['alface LC CO Mar Q2–Dez Q2']);
  });

  it('keeps the perennial strawberry harvest from the data', () => {
    const strawberry = catalog.windows.filter((w) => w.cropId === 'morango' && w.action === 'CO');
    expect(strawberry.map(key).sort()).toEqual([
      'morango IN CO Mai Q1–Jun Q1',
      'morango LC CO Abr Q1–Jun Q2',
      'morango LN CO Abr Q1–Jun Q2',
      'morango SU CO Abr Q1–Jun Q2',
    ]);
  });

  it('attaches zone notes to every window of that crop and zone', () => {
    const melonIN = catalog.windows.filter((w) => w.cropId === 'melao' && w.zoneId === 'IN');
    expect(melonIN.length).toBeGreaterThan(0);
    expect(melonIN.every((w) => w.note?.pt.startsWith('Marginal no interior'))).toBe(true);
    expect(catalog.windows.some((w) => w.cropId === 'melao' && w.zoneId === 'LC' && w.note)).toBe(
      false,
    );
  });

  it('reports the known agronomic issues of the v0.1 rules as warnings', () => {
    expect(warnings).toEqual([
      expect.stringMatching(/^couve_tronchuda in IN: transplanting \(Jul Q1\)/),
      expect.stringMatching(/^brocolo in IN: transplanting \(Jun Q2\)/),
      'cebola in SU: nursery sowing windows overlap',
    ]);
  });
});

describe('validation', () => {
  const broken = (patch: Partial<DataFiles>) => () => buildCatalog({ ...realFiles, ...patch });
  const problems = (patch: Partial<DataFiles>) => {
    try {
      buildCatalog({ ...realFiles, ...patch });
    } catch (e) {
      if (e instanceof DataError) return e.problems;
      throw e;
    }
    return [];
  };

  it('requires English for every text (D-13)', () => {
    const culturas = realFiles.culturas.replace(',Lettuce,', ',,');
    expect(problems({ culturas })).toEqual([
      expect.stringMatching(/^culturas\.csv:2: "nome_en" is empty/),
    ]);
  });

  it('rejects unknown values and bad numbers, reporting them all at once', () => {
    const culturas = realFiles.culturas
      .replace(',folha,fresca,60,90,', ',caule,fresca,90,60,')
      .replace('Couve-coração,Sweetheart cabbage', 'Couve-coração,Cabbage');
    const janelas = realFiles.janelas
      .replace('alface,TR,Mar Q1', 'alface,TR,Mar Q3')
      .replace('nabo,SD,Fev Q1', 'nabos,SD,Fev Q1');
    const found = problems({ culturas, janelas });
    expect(found).toEqual(
      expect.arrayContaining([
        expect.stringContaining('"parte_comestivel" is "caule"'),
        expect.stringContaining('cycle 90–60'),
        expect.stringContaining('"inicio": invalid fortnight "Mar Q3"'),
        expect.stringContaining('unknown crop "nabos"'),
      ]),
    );
  });

  it('requires days to transplant exactly for crops sown in trays (D-20)', () => {
    const missing = realFiles.culturas.replace(/,28,42$/m, ',,');
    expect(problems({ culturas: missing })).toEqual([
      expect.stringContaining('alface is sown in trays (SV) but has no dias_ate_transplante'),
    ]);
    const extra = realFiles.culturas.replace(/(fava,.*),,$/m, '$1,20,30');
    expect(problems({ culturas: extra })).toEqual([
      expect.stringContaining('fava has dias_ate_transplante but is never sown in trays'),
    ]);
    const reversed = realFiles.culturas.replace(/,28,42$/m, ',42,28');
    expect(problems({ culturas: reversed })).toEqual([
      expect.stringContaining('days to transplant 42–28'),
    ]);
  });

  it('validates lunar periods (RF-09)', () => {
    const unknown = realFiles.regrasLunares.replace(',SD;SV,crescente,', ',SD;SV,crescent,');
    expect(problems({ regrasLunares: unknown })).toEqual([
      expect.stringContaining('"periodos" contains "crescent"'),
    ]);
    const avoid = realFiles.regrasLunares.replace('evitar,nova;cheia', 'evitar,crescente');
    expect(problems({ regrasLunares: avoid })).toEqual([
      expect.stringContaining('only nova and cheia apply'),
    ]);
  });

  it('validates saints: dates, origin and duplicates (RF-08)', () => {
    const santos = `${realFiles.santos}2,30,São Ninguém,Saint Nobody,geral\n13,1,São X,Saint X,geral\n6,14,São Lenda,Saint Legend,lenda\n1,17,Santo Antão,Saint Anthony the Abbot,geral\n`;
    expect(problems({ santos })).toEqual([
      expect.stringContaining('"dia" is 30, but month 2 has 29 days'),
      expect.stringContaining('"mes" is 13, expected 1–12'),
      expect.stringContaining('"origem" is "lenda"'),
      expect.stringContaining('"Santo Antão" is listed twice on the same day'),
    ]);
  });

  it('validates sayings: meaning, duplicates and enough per month (RF-08)', () => {
    const ditados = `${realFiles.ditados}5,,Um ditado sem sentido.,\n1,,A água de janeiro vale dinheiro.,Again\n`;
    expect(problems({ ditados })).toEqual([
      expect.stringContaining('"sentido_en" is empty'),
      expect.stringContaining('is listed twice'),
    ]);
    const onlyJanuaryDay = 'mes,dia,ditado,sentido_en\n1,22,Um.,One.\n';
    expect(problems({ ditados: onlyJanuaryDay })).toHaveLength(12);
    expect(problems({ ditados: onlyJanuaryDay })[0]).toContain(
      'month 1 has 0 sayings without a day; at least 5 are needed',
    );
  });

  it('rejects stored harvests for non-perennial crops (D-19)', () => {
    const janelas = `${realFiles.janelas}alface,CO,Abr Q1,Dez Q2,,\n`;
    expect(problems({ janelas })).toEqual([
      expect.stringContaining('harvest (CO) is calculated for alface'),
    ]);
  });

  it('requires every district in exactly one zone', () => {
    const zonas = realFiles.zonas.replace('Portalegre;', '');
    expect(problems({ zonas })).toEqual([
      expect.stringContaining('district Portalegre is in 0 zones'),
    ]);
  });

  it('rejects ambiguous derivation rules', () => {
    const regrasDerivacao = `${realFiles.regrasDerivacao}LN,quente,primavera,SV,2,2,Dup,Dup\n`;
    expect(problems({ regrasDerivacao })).toEqual(
      expect.arrayContaining([expect.stringContaining('2 rules match LN/quente/primavera/SV')]),
    );
  });

  it('does not accept rules for the base zone', () => {
    const regrasDerivacao = `${realFiles.regrasDerivacao}LC,todas,todas,SD,1,1,X,X\n`;
    expect(problems({ regrasDerivacao })).toEqual([
      expect.stringContaining('the base zone has no rules'),
    ]);
  });

  it('throws a DataError whose message lists the problems', () => {
    expect(broken({ zonas: realFiles.zonas.replace('LN,', 'XX,') })).toThrow(
      /Invalid data in \/data:\n {2}- zonas\.csv:2: "id" is "XX"/,
    );
  });
});
