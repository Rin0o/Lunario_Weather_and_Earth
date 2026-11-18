# Catalogue data

These CSV files are the **single source of truth** for Lunário's sowing calendar (RNF-04).
`npm run catalog` validates them and generates `app/src/catalog/catalog.json`, which the app
bundles so it works offline. The generated file is not committed; it is rebuilt before
`dev`, `build`, `typecheck` and the tests.

Edit the files in any spreadsheet app or text editor, keeping UTF-8 and commas as separators.
Every visible text has a Portuguese (`_pt`) and an English (`_en`) column, and the build fails
if either is missing (D-13).

## Files

| File                   | One row per                                       | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `zonas.csv`            | agroclimatic zone                                 | `distritos`: IPMA district names separated by `;`. Every mainland district must be in exactly one zone.                                                                                                                                                                                                                                                                                                                                          |
| `culturas.csv`         | crop                                              | `id` is lower case with `_`. `ciclo_dias_min/max`: days from sowing or planting to harvest; empty for perennials (`perene` = `sim`). `dias_ate_transplante_min/max`: days in the nursery before transplanting, required exactly for crops sown in trays (`SV`); Values reviewed in 2026-11 (Q-12). `sensivel_geada` (`sim`/`nao`): damaged by frost, so the frost warning names it when it is in the garden (RF-16).                             |
| `janelas.csv`          | window in the **base zone (Litoral Centro) only** | The other zones are derived by the rules (D-08). Harvests (`CO`) are calculated (D-19), so only perennial crops list one.                                                                                                                                                                                                                                                                                                                        |
| `regras-derivacao.csv` | derivation rule                                   | How each zone's windows differ from Litoral Centro, in fortnights.                                                                                                                                                                                                                                                                                                                                                                               |
| `janelas-zona.csv`     | window written by hand for one zone (not LC)      | Only where the rules give something incoherent (Q-10). Each crop, zone and action listed replaces its derived windows; `motivo_*` records why.                                                                                                                                                                                                                                                                                                   |
| `avisos-zona.csv`      | crop and zone note                                | Shown next to the crop in that zone, e.g. "only under cover" inland.                                                                                                                                                                                                                                                                                                                                                                             |
| `regras-lunares.csv`   | traditional lunar rule                            | For the optional Moon mode (RF-09). Folklore, not agronomic advice (RNF-05). `periodos`: `nova`, `crescente`, `cheia`, `minguante`, each lasting from its principal phase to the next; for `evitar`, the phases whose exact day to avoid. `conselho_*` is the text shown.                                                                                                                                                                        |
| `santos.csv`           | saint or feast on a fixed date                    | For the saint of the day (RF-08). `origem`: `geral` (General Roman Calendar), `portugal` (Portugal's own calendar), `popular` (popular devotion, e.g. Santo Isidro Lavrador). A day may have several; days with none show no saint. Movable feasts (Easter, Corpus Christi…) are not listed.                                                                                                                                                     |
| `ditados.csv`          | traditional saying                                | For the saying of the day (RF-08). Kept in Portuguese; `sentido_en` gives its meaning, not a translation (D-13). With `dia`, it is shown on that date only; without, it takes turns on the other days of the month. Each month needs at least 5 without `dia`. `temas`: one or two of `tempo`, `ceu` (Moon and Sun), `horta`, `searas` (grain and bread), `vinha`, `animais`, `festas`, separated by `;`, for the filter in the library (RF-20). |

## Licence of the saints and sayings

`santos.csv` and `ditados.csv` are a selection adapted from Wikipedia ("Calendário Romano Geral")
and Wikiquote ("Provérbios portugueses"), with additions for Portugal. They are licensed under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), unlike the rest of the
repository: keep the attribution in [CREDITS.md](../CREDITS.md) and in the app. Spelling follows
the current agreement (AO90), so month names are in lower case.

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
   `ajuste_inicio` and the end by `ajuste_fim` fortnights. Windows in `janelas-zona.csv` then replace the derived ones for their crop, zone and action. With no matching rule the window is
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
