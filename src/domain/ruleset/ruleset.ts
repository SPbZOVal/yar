/**
 * RuleSet — the single source of truth for balance constants and formulas (§12.2,
 * §11.2). Tuning the game means editing this file and nothing else; any balance
 * change is documented here (Definition of Done §14.6).
 *
 * Formulas are kept pure and free of model coupling: callers (e.g. CardResolver)
 * pass already-resolved numbers (the weapon bonus, the summed status modifier),
 * not domain objects.
 */
import type { GenerationParams, Rarity } from '../model';

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
  // Guarantee one question per level, placed in the first layer (reachable straight from Start) —
  // keeps the math-stats quiz reliably reachable for testing; the rest of the mix stays weighted.
  nodeMinimums: { combat: 0, loot: 0, question: 1 },
  midBossCount: { min: 1, max: 2 },
  edgeDensity: 0.5,
  difficultyScaling: 1.2,
};

/**
 * Loot-roll tuning (§7.6, §10.2). Rarity weights drive the cumulative weighted pick in
 * the LootSystem; chests roll on `rarityWeights` (Boss-rarity weight 0, so chests never
 * yield Boss cards), the end boss rolls on `bossRarityWeights` (Rare/Boss-heavy).
 * `equipmentDropChance` is the probability a chest/boss reward is a weapon/armor piece
 * (from the `content/weapons`+`content/armor` pools) instead of a card.
 */
export const LOOT_PARAMS: {
  readonly rarityWeights: Record<Rarity, number>;
  readonly bossRarityWeights: Record<Rarity, number>;
  readonly equipmentDropChance: number;
} = {
  rarityWeights: { Common: 60, Uncommon: 30, Rare: 10, Boss: 0 },
  bossRarityWeights: { Common: 0, Uncommon: 20, Rare: 50, Boss: 30 },
  equipmentDropChance: 0.15,
};

/**
 * Level-generation tuning the algorithm needs beyond {@link GenerationParams}:
 * `maxRetries` bounds the validate-or-regenerate loop, `maxEnemiesPerNode` caps how many
 * enemies difficulty scaling can stack onto one combat node.
 */
export const LEVEL_PARAMS = { maxRetries: 8, maxEnemiesPerNode: 3 } as const;

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
  /** Cap on cards selected from the collection into a run deck before a level. */
  maxDeckSize: 3,
} as const;

/** Convenience aggregate so callers can `import { RuleSet }`. */
export const RuleSet = {
  damageFormula,
  maxHpFormula,
  GENERATION_PARAMS,
  LOOT_PARAMS,
  LEVEL_PARAMS,
  BALANCE_CONSTANTS,
} as const;
