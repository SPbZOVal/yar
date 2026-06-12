import { BALANCE_CONSTANTS, GENERATION_PARAMS, damageFormula, maxHpFormula } from '../ruleset';

describe('damageFormula', () => {
  it('sums base + weapon + status, then subtracts block', () => {
    // 6 base + 2 weapon + 1 status - 3 block = 6
    expect(damageFormula(6, 2, 1, 3)).toBe(6);
  });

  it('is just the base when there are no modifiers or block', () => {
    expect(damageFormula(8, 0, 0, 0)).toBe(8);
  });

  it('clamps at 0 when block fully absorbs the hit', () => {
    expect(damageFormula(5, 0, 0, 10)).toBe(0);
    expect(damageFormula(5, 2, 0, 100)).toBe(0);
  });

  it('applies negative status modifiers (weakness)', () => {
    // 10 base - 4 weakness - 0 block = 6
    expect(damageFormula(10, 0, -4, 0)).toBe(6);
  });
});

describe('maxHpFormula', () => {
  it('adds armor and special-card bonuses to the base', () => {
    expect(maxHpFormula(50, 10, 15)).toBe(75);
  });

  it('equals the base with no bonuses', () => {
    expect(maxHpFormula(50, 0, 0)).toBe(50);
  });
});

describe('GENERATION_PARAMS', () => {
  it('has valid min <= max ranges', () => {
    expect(GENERATION_PARAMS.layerCount.min).toBeLessThanOrEqual(GENERATION_PARAMS.layerCount.max);
    expect(GENERATION_PARAMS.layerWidth.min).toBeLessThanOrEqual(GENERATION_PARAMS.layerWidth.max);
    expect(GENERATION_PARAMS.midBossCount.min).toBeLessThanOrEqual(
      GENERATION_PARAMS.midBossCount.max,
    );
  });

  it('keeps edge density within [0, 1]', () => {
    expect(GENERATION_PARAMS.edgeDensity).toBeGreaterThanOrEqual(0);
    expect(GENERATION_PARAMS.edgeDensity).toBeLessThanOrEqual(1);
  });

  it('uses non-negative node weights', () => {
    const { combat, loot, question } = GENERATION_PARAMS.nodeWeights;
    expect(Math.min(combat, loot, question)).toBeGreaterThanOrEqual(0);
    expect(combat + loot + question).toBeGreaterThan(0);
  });
});

describe('BALANCE_CONSTANTS', () => {
  it('exposes positive core tuning values', () => {
    expect(BALANCE_CONSTANTS.defaultHandSize).toBeGreaterThan(0);
    expect(BALANCE_CONSTANTS.defaultEnergyPerTurn).toBeGreaterThan(0);
    expect(BALANCE_CONSTANTS.baseMaxHp).toBeGreaterThan(0);
    expect(BALANCE_CONSTANTS.specialHeartBonus).toBeGreaterThan(0);
  });
});
