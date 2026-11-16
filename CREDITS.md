# Credits

Every third-party asset and data source used by Lunário is recorded here with its origin
and licence (see RNF-07 in [LUNARIO.md](LUNARIO.md)).

## Data sources

| Source                                                                                           | Used for                                 | Terms                                                                                                                           |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [IPMA](https://api.ipma.pt) open data                                                            | Daily forecast, forecast locations       | Free use with attribution to IPMA                                                                                               |
| [Open-Meteo](https://open-meteo.com)                                                             | Frost risk (air and surface temperature) | Data [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); free API for non-commercial use                                 |
| [Wikipedia: Calendário Romano Geral](https://pt.wikipedia.org/wiki/Calend%C3%A1rio_Romano_Geral) | Saints of the day (`data/santos.csv`)    | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); adapted, with Portugal's own calendar and popular saints added |
| [Wikiquote: Provérbios portugueses](https://pt.wikiquote.org/wiki/Prov%C3%A9rbios_portugueses)   | Sayings of the day (`data/ditados.csv`)  | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); a selection, spelling updated, English meanings added          |

The app must show this attribution (footer or about screen) as soon as it displays data
from either source. The weather card shows "Fonte: IPMA" / "Source: IPMA", and the frost warning shows
"Fonte: Open-Meteo (CC BY 4.0)". The almanac card credits Wikipedia and
Wikiquote with links and the licence; the two data files stay under CC BY-SA 4.0.

## Libraries with a visible role

| Library                                                                  | Used for                                      | Licence |
| ------------------------------------------------------------------------ | --------------------------------------------- | ------- |
| [astronomy-engine](https://github.com/cosinekitty/astronomy) (Don Cross) | Moon phases, sunrise/sunset, moonrise/moonset | MIT     |

Reference values in the astronomy tests come from the
[US Naval Observatory](https://aa.usno.navy.mil/data) (public domain). Reference holiday
lists in the holiday tests were checked against [Nager.Date](https://date.nager.at).

## Assets

| Asset      | Used for | Source | Licence |
| ---------- | -------- | ------ | ------- |
| _none yet_ |          |        |         |

The app icon (`public/icon.svg`) is original to this project.
