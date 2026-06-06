/**
 * RuleSet — the single source of truth for balance constants and formulas (§12.2,
 * §11.2). Tuning the game means editing this file and nothing else; any balance
 * change is documented here (Definition of Done §14.6).
 *
 * Formulas are kept pure and free of model coupling: callers (e.g. CardResolver)
 * pass already-resolved numbers (the weapon bonus, the summed status modifier),
 * not domain objects.
 */
import type { GenerationParams } from '../model';

/**
 * Damage dealt by an attacking effect (§12.2):
 *
 *   damage = effect.value + weapon.attackBonus + statusModifiers - target.block
 *
 * The document does not specify a lower bound, but negative damage is nonsensical
 * (a large block would otherwise "heal" the target), so the result is clamped at 0.
 */
export function damageFormula(
  base: number,
  weaponBonus: number,
  statusModifier: number,
  targetBlock: number,
): number {
  return Math.max(0, base + weaponBonus + statusModifier - targetBlock);
}

/**
 * Player max HP (§12.2):
 *
 *   maxHp = baseMaxHp + armor.maxHpBonus + specialCardsBonus   ("+heart" cards)
 */
export function maxHpFormula(
  baseMaxHp: number,
  armorMaxHpBonus: number,
  specialCardsBonus: number,
): number {
  return baseMaxHp + armorMaxHpBonus + specialCardsBonus;
}

/** Default procedural-generation parameters (§11.2). Placeholder values, tuned later. */
export const GENERATION_PARAMS: GenerationParams = {
  layerCount: { min: 4, max: 6 },
  layerWidth: { min: 2, max: 4 },
  nodeWeights: { combat: 6, loot: 2, question: 2 },
  midBossCount: { min: 1, max: 2 },
  edgeDensity: 0.5,
  difficultyScaling: 1.2,
};

/** Core balance constants. Placeholder values, tuned later. */
export const BALANCE_CONSTANTS = {
  /** Cards drawn at the start of each turn by default. */
  defaultHandSize: 5,
  /** Energy restored each turn by default. */
  defaultEnergyPerTurn: 3,
  /** Starting max HP before armor / special-card bonuses. */
  baseMaxHp: 50,
  /** Max HP granted per "+heart" special card. */
  specialHeartBonus: 5,
} as const;

/** Convenience aggregate so callers can `import { RuleSet }`. */
export const RuleSet = {
  damageFormula,
  maxHpFormula,
  GENERATION_PARAMS,
  BALANCE_CONSTANTS,
} as const;
