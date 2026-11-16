import type { EdiblePart, LunarPeriod, LunarRule } from '../catalog/types.ts';
import type { MoonPhaseName } from './moon.ts';

/**
 * The traditional period of a day (RF-09). Almanacs count four periods of about a week, each
 * from its principal phase to the next; a day on which a principal phase falls starts it.
 */
export function lunarPeriod(phase: MoonPhaseName): LunarPeriod {
  switch (phase) {
    case 'new':
    case 'waxing-crescent':
      return 'nova';
    case 'first-quarter':
    case 'waxing-gibbous':
      return 'crescente';
    case 'full':
    case 'waning-gibbous':
      return 'cheia';
    case 'last-quarter':
    case 'waning-crescent':
      return 'minguante';
  }
}

export interface TraditionToday {
  period: LunarPeriod;
  /** Rules that tradition favours in this period. */
  favoured: LunarRule[];
  /** The "avoid" rule, when today is the exact day of a new or full moon. */
  avoid: LunarRule | null;
}

export function traditionFor(rules: readonly LunarRule[], phase: MoonPhaseName): TraditionToday {
  const period = lunarPeriod(phase);
  const exact = phase === 'new' ? 'nova' : phase === 'full' ? 'cheia' : null;
  return {
    period,
    favoured: rules.filter((r) => !r.actions.includes('evitar') && r.periods.includes(period)),
    avoid:
      (exact && rules.find((r) => r.actions.includes('evitar') && r.periods.includes(exact))) ||
      null,
  };
}

/** The traditional rules that apply to a crop's edible part, plus those for all crops. */
export function traditionForCrop(rules: readonly LunarRule[], part: EdiblePart): LunarRule[] {
  return rules.filter(
    (r) => !r.actions.includes('evitar') && (r.part === part || r.part === 'todas'),
  );
}
