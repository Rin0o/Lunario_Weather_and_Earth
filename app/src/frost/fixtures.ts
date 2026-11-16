/** Builds an Open-Meteo hourly response from daily minimums, for tests. */
export function openMeteoJson(days: { date: string; air: number; surface: number | null }[]) {
  const time: string[] = [];
  const air: number[] = [];
  const surface: (number | null)[] = [];
  for (const d of days) {
    for (let h = 0; h < 24; h++) {
      time.push(`${d.date}T${String(h).padStart(2, '0')}:00`);
      // Coldest at 06:00, 10 °C warmer at 15:00.
      const warm = h === 6 ? 0 : h === 15 ? 10 : 5;
      air.push(d.air + warm);
      surface.push(d.surface === null ? null : d.surface + warm);
    }
  }
  return { hourly: { time, temperature_2m: air, soil_temperature_0cm: surface } };
}
