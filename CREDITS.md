# Credits

Every third-party asset and data source used by Lunário is recorded here with its origin
and licence (see RNF-07 in [LUNARIO.md](LUNARIO.md)).

## Data sources

| Source                                | Used for                                 | Terms                                                                                           |
| ------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [IPMA](https://api.ipma.pt) open data | Daily forecast, forecast locations       | Free use with attribution to IPMA                                                               |
| [Open-Meteo](https://open-meteo.com)  | Frost risk (air and surface temperature) | Data [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); free API for non-commercial use |

The app must show this attribution (footer or about screen) as soon as it displays data
from either source. The weather card shows "Fonte: IPMA" / "Source: IPMA"; Open-Meteo will be
credited the same way when frost alerts use it.

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
