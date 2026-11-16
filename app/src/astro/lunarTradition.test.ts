import { describe, expect, it } from 'vitest';
import { catalog } from '../catalog/catalog.ts';
import { lunarPeriod, traditionFor, traditionForCrop } from './lunarTradition.ts';

const advice = (rules: { advice: { pt: string } }[]) => rules.map((r) => r.advice.pt);

describe('lunar tradition (RF-09)', () => {
  it.each([
    ['new', 'nova'],
    ['waxing-crescent', 'nova'],
    ['first-quarter', 'crescente'],
    ['waxing-gibbous', 'crescente'],
    ['full', 'cheia'],
    ['waning-gibbous', 'cheia'],
    ['last-quarter', 'minguante'],
    ['waning-crescent', 'minguante'],
  ] as const)('a %s day belongs to the %s period', (phase, period) => {
    expect(lunarPeriod(phase)).toBe(period);
  });

  it('favours roots, transplanting and harvest for storage in the last quarter', () => {
    const today = traditionFor(catalog.lunarRules, 'waning-crescent');
    expect(today.period).toBe('minguante');
    expect(today.avoid).toBeNull();
    expect(advice(today.favoured)).toEqual([
      'Semear e plantar raízes, tubérculos e bolbos',
      'Transplantar',
      'Colher para conservar (batata, cebola, alho, abóbora)',
    ]);
  });

  it('favours sowing above-ground crops in the first quarter', () => {
    expect(advice(traditionFor(catalog.lunarRules, 'waxing-gibbous').favoured)).toEqual([
      'Semear culturas de folha',
      'Semear culturas de fruto',
      'Semear culturas de flor (couve-flor, brócolo)',
      'Colher para consumo imediato',
    ]);
  });

  it('warns on the exact day of a new or full moon only', () => {
    expect(traditionFor(catalog.lunarRules, 'full').avoid?.advice.pt).toBe(
      'Evitar semear, plantar e transplantar',
    );
    expect(traditionFor(catalog.lunarRules, 'new').avoid).not.toBeNull();
    expect(traditionFor(catalog.lunarRules, 'waning-gibbous').avoid).toBeNull();
    expect(traditionFor(catalog.lunarRules, 'first-quarter').avoid).toBeNull();
  });

  it('has nothing to favour in the new moon period', () => {
    expect(traditionFor(catalog.lunarRules, 'waxing-crescent').favoured).toEqual([]);
  });

  it("lists a crop's rules: its edible part plus those for all crops", () => {
    expect(advice(traditionForCrop(catalog.lunarRules, 'folha'))).toEqual([
      'Semear culturas de folha',
      'Transplantar',
      'Colher para conservar (batata, cebola, alho, abóbora)',
      'Colher para consumo imediato',
    ]);
    expect(advice(traditionForCrop(catalog.lunarRules, 'raiz'))[0]).toBe(
      'Semear e plantar raízes, tubérculos e bolbos',
    );
  });
});
