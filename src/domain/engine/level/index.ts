/** Barrel for the LevelGenerator: pure generator + production deps from content/RuleSet. */
import { ENEMIES } from '../../content/enemies';
import { LEVEL_PARAMS } from '../../ruleset/ruleset';
import { defaultLootDeps, defaultQuestionDeps, rollChestLoot, rollQuestion } from '../loot';
import type { LevelGenDeps } from './levelGenerator';

export { generateLevel, validate } from './levelGenerator';
export type { LevelGenDeps } from './levelGenerator';

/**
 * Production generation deps: enemies split into combat/boss pools from content, the loot
 * rollers bound to their production deps, and the caps from `RuleSet.LEVEL_PARAMS`.
 */
export const defaultLevelGenDeps = (): LevelGenDeps => {
  const lootDeps = defaultLootDeps();
  const questionDeps = defaultQuestionDeps();
  return {
    enemyPool: ENEMIES.filter((e) => !e.isBoss),
    bossPool: ENEMIES.filter((e) => e.isBoss),
    rollChestLoot: (seed) => rollChestLoot(lootDeps, seed),
    rollQuestion: (seed) => rollQuestion(questionDeps, seed),
    maxRetries: LEVEL_PARAMS.maxRetries,
    maxEnemiesPerNode: LEVEL_PARAMS.maxEnemiesPerNode,
  };
};
