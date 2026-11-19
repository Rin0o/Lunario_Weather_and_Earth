# Lunário

_A rural almanac in your pocket._

Lunário is a small, offline-first web app inspired by the traditional Portuguese
almanacs that have guided growers for generations. It brings together the
practical knowledge of the rural calendar in one place, in five tabs:

- ☀️ **Hoje (Today)**: the Moon and Sun, local weather from IPMA, what to sow, transplant
  and harvest this fortnight in your region, the saint of the day, a saying and the next
  holidays
- 🌙 **Céu (Sky)**: Moon phases, sunrise and sunset, moonrise and moonset, and the seasons
  with the year's solstices and equinoxes, all calculated on the device
- 🌊 **Mar (Sea)**: tides calculated on the device, waves, swell, wind, water temperature
  and IPMA's sea agitation warnings, for the nearest port or one you choose
- 🧺 **Horta (My garden)**: log what you've sown or planted, see when to transplant and
  harvest, add reminders to your calendar and back the garden up to a file
- 📚 **Biblioteca (Library)**: crop sheets with spacing, cycle and botanical engravings;
  every saying, saint and moveable feast; the year's holidays and Moon phases
- ❄️ **Alerts**: frost and sea agitation warnings by push notification, even with the app
  closed (optional)
- 🌍 **Portuguese and English** (Portuguese by default)

Built as a Progressive Web App with no accounts and no server holding your data. It
installs on your phone, works without signal in the field, and keeps your garden log on
your device. A single scheduled job on Cloudflare sends the alerts, and only to those who
turn them on. Traditional lunar gardening is available as an optional mode, presented as
folklore rather than agronomic advice.

Weather and sea data by [IPMA](https://www.ipma.pt) and [Open-Meteo](https://open-meteo.com)
(CC BY 4.0); tide gauges from [IOC/VLIZ](https://www.ioc-sealevelmonitoring.org). The tides
are not for navigation.

Made for a small circle of family and friends. Not affiliated with any published almanac.

## Installing the app

Lunário is not in any app store. You install it straight from the browser, at
**<https://lunario-4w2.pages.dev>**. Once installed it opens in its own window with its own
icon, like any other app, and works offline.

**Android (Chrome)**

1. Open <https://lunario-4w2.pages.dev> in Chrome.
2. Tap the menu **⋮** at the top right and choose **Add to home screen** (or **Install
   app**), then **Install**.
3. Lunário appears on the home screen and in the app drawer.

Other Android browsers work too: in **Firefox**, menu **⋮** → **Add app to Home screen**;
in **Samsung Internet**, menu **☰** → **Add page to** → **Home screen**.

**iPhone and iPad (Safari)**

1. Open <https://lunario-4w2.pages.dev> in Safari.
2. Tap the **Share** button (the square with an arrow) and choose **Add to Home Screen**.
3. Tap **Add**.

On iPhone, push alerts only work in the app opened from the home screen, on iOS 16.4 or
later.

**Computer (Chrome or Edge)**

Open the site and click the install icon at the right of the address bar, or use the menu:
in Chrome, **⋮** → **Cast, save and share** → **Install page as app**; in Edge, **…** →
**Apps** → **Install this site as an app**.

**After installing**

- Updates install themselves: the app picks up the new version the next time it is opened
  with a connection.
- Allow the location when asked, or pick your place in **Definições** (Settings, the gear at
  the top), so the weather, the sowing calendar and the port are right for you.
- To get frost or sea alerts with the app closed, tap the bell at the top and turn them on.
  Your phone will ask for permission to show notifications.
- Your garden lives only on this phone. Use **Horta → Cópia de segurança** to save it to a
  file before changing phones or clearing the browser's data.

To remove it, uninstall it like any other app (long press the icon → **Uninstall** or
**Remove**).

## Development

```sh
npm ci
npm run dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow, tests, releases and CI/CD,
[LUNARIO.md](LUNARIO.md) for requirements and architecture decisions (in Portuguese), and
[data/README.md](data/README.md) for the catalogue format.

## Licence

The code and documentation are released under the [MIT License](LICENSE).

Two data files are the exception: [`data/santos.csv`](data/santos.csv) and
[`data/ditados.csv`](data/ditados.csv) are adapted from Wikipedia and Wikiquote and stay
under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). If you reuse them,
credit the sources and share your changes under the same licence. Weather and sea data
belong to IPMA, Open-Meteo and IOC/VLIZ under their own terms. [CREDITS.md](CREDITS.md)
lists every third-party source and its licence.
