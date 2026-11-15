/** Emoji for IPMA weather types (idWeatherType 0–30). Placeholder until a licensed icon set. */
const ICONS: Record<number, string> = {
  0: '❔',
  1: '☀️',
  2: '🌤️',
  3: '⛅',
  4: '☁️',
  5: '🌥️',
  6: '🌦️',
  7: '🌦️',
  8: '🌧️',
  9: '🌧️',
  10: '🌦️',
  11: '🌧️',
  12: '🌦️',
  13: '🌦️',
  14: '🌧️',
  15: '🌦️',
  16: '🌫️',
  17: '🌫️',
  18: '🌨️',
  19: '⛈️',
  20: '⛈️',
  21: '🌨️',
  22: '❄️',
  23: '⛈️',
  24: '🌥️',
  25: '⛅',
  26: '🌫️',
  27: '☁️',
  28: '🌨️',
  29: '🌨️',
  30: '🌨️',
};

export const weatherIcon = (type: number): string => ICONS[type] ?? '❔';

/** IPMA types with a translated description; others fall back to "no information". */
export const isKnownWeatherType = (type: number): boolean => type in ICONS;
