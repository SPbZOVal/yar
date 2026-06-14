/** Barrel for the LootSystem: pure rollers + production deps drawn from content/RuleSet. */
import { CARDS } from '../../content/cards';
import { QUESTIONS } from '../../content/questions';
import { WEAPONS } from '../../content/weapons';
import { ARMORS } from '../../content/armor';
import { LOOT_PARAMS } from '../../ruleset/ruleset';
import type { LootDeps, QuestionDeps } from './lootSystem';

export { rollChestLoot, rollBossLoot, rollQuestion } from './lootSystem';
export type { LootDeps, QuestionDeps, QuestionTemplate } from './lootSystem';

/** Production loot deps: card + equipment pools and the tuned weights/chances from `RuleSet`. */
export const defaultLootDeps = (): LootDeps => ({
  cardPool: CARDS,
  rarityWeights: LOOT_PARAMS.rarityWeights,
  bossRarityWeights: LOOT_PARAMS.bossRarityWeights,
  weaponPool: WEAPONS,
  armorPool: ARMORS,
  equipmentDropChance: LOOT_PARAMS.equipmentDropChance,
});

/** Production question deps: loot deps plus the question prompt pool. */
export const defaultQuestionDeps = (): QuestionDeps => ({
  ...defaultLootDeps(),
  questionPool: QUESTIONS,
});
