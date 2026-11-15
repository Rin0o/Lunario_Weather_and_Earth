# Catalogue data

These CSV files are the **single source of truth** for Lunário's sowing calendar (RNF-04).
`npm run catalog` validates them and generates `app/src/catalog/catalog.json`, which the app
bundles so it works offline. The generated file is not committed; it is rebuilt before
`dev`, `build`, `typecheck` and the tests.

Edit the files in any spreadsheet app or text editor, keeping UTF-8 and commas as separators.
Every visible text has a Portuguese (`_pt`) and an English (`_en`) column, and the build fails
if either is missing (D-13).

## Files

| File                   | One row per                                       | Notes                                                                                                                                |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `zonas.csv`            | agroclimatic zone                                 | `distritos`: IPMA district names separated by `;`. Every mainland district must be in exactly one zone.                              |
| `culturas.csv`         | crop                                              | `id` is lower case with `_`. `ciclo_dias_min/max`: days from sowing or planting to harvest; empty for perennials (`perene` = `sim`). |
| `janelas.csv`          | window in the **base zone (Litoral Centro) only** | The other zones are derived by the rules (D-08). Harvests (`CO`) are calculated (D-19), so only perennial crops list one.            |
| `regras-derivacao.csv` | derivation rule                                   | How each zone's windows differ from Litoral Centro, in fortnights.                                                                   |
| `avisos-zona.csv`      | crop and zone note                                | Shown next to the crop in that zone, e.g. "only under cover" inland.                                                                 |
| `regras-lunares.csv`   | traditional lunar rule                            | For the optional Moon mode (RF-09). Folklore, not agronomic advice (RNF-05).                                                         |

## Codes

- **Actions** (`acao`, `acoes`): `SV` sow in a nursery/trays, `SD` sow directly, `TR`
  transplant, `PL` plant (tuber, bulb, clove, slip, crown), `CO` harvest.
- **Fortnights** (`inicio`, `fim`): `Jan Q1` (1–15 January) … `Dez Q2` (16–31 December). A
  window whose end comes before its start crosses the new year (`Out Q2` → `Jan Q2`).
- **Climate class** (`classe_climatica`): `fresca`, `neutra`, `quente`.
- **Edible part** (`parte_comestivel`): `folha`, `flor`, `raiz`, `fruto`.
- **Zones**: `LN` Litoral Norte, `LC` Litoral Centro (base), `IN` Interior, `SU` Sul.

## How the calendar is built

1. **Derivation (D-08).** For each Litoral Centro window and each other zone, the build finds
   the rule for that zone, the crop's climate class, the season (`primavera` if the window
   starts January–June, `outono` otherwise) and the action. It moves the start by
   `ajuste_inicio` and the end by `ajuste_fim` fortnights. With no matching rule the window is
   copied unchanged. Two rules matching the same case is an error. `todas` means every class or
   both seasons.
2. **Harvest (D-19).** For every sowing or planting window (`SV`, `SD`, `PL`), the harvest runs
   from the first sowing day plus the shortest cycle to the last sowing day plus the longest
   cycle. Overlapping harvests of one crop in a zone are merged. Perennials keep the harvest
   given in `janelas.csv`, derived like any other window.
3. **Checks.** Errors (bad codes, missing English, unknown crops, ambiguous rules…) stop the
   build and are listed together with file and line. Agronomic **warnings**, such as
   transplanting starting in the same fortnight as nursery sowing, are printed but do not
   stop the build.

`scripts/__fixtures__/janelas-folha-v0.1.csv` holds the derived windows of the original
spreadsheet (v0.1); a test checks that the build reproduces them exactly. If you change the
rules on purpose, update that fixture or the test will fail.
