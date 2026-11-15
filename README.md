# Lunário

_A rural almanac in your pocket._

Lunário is a small, offline-first web app inspired by the traditional Portuguese
almanacs that have guided growers for generations. It brings together the
practical knowledge of the rural calendar in one place:

- 🌙 **Moon phases, sunrise and sunset**, calculated on the device
- 🌦️ **Local weather** from IPMA, the Portuguese weather service
- 🌱 **What to sow, transplant and harvest** this fortnight, adjusted to your region
- 🥕 **Crop notes**: spacing, growing cycle and companion tips
- 📅 **Saints' days, holidays and old sayings**
- 🧺 **My garden**: log what you've planted and get harvest reminders in your calendar
- ❄️ **Frost alerts** for your region, from Open-Meteo forecasts
- 🌍 **Portuguese and English**

Built as a Progressive Web App with no accounts and no server holding your data. It
installs on your phone, works without signal in the field, and keeps your garden log on
your device. A single scheduled job on Cloudflare sends the frost alerts. Traditional
lunar gardening is available as an optional mode, presented as folklore rather than
agronomic advice.

Weather data by [IPMA](https://www.ipma.pt) and [Open-Meteo](https://open-meteo.com)
(CC BY 4.0).

Made for a small circle of family and friends. Not affiliated with any published almanac.

## Development

```sh
npm ci
npm run dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow, tests, releases and CI/CD, and
[LUNARIO.md](LUNARIO.md) for requirements and architecture decisions.
