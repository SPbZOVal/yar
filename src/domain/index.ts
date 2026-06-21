/**
 * Public surface of the pure-TypeScript domain layer.
 *
 * This is the single import point for the future GameStore and UI:
 * `import { DeckManager, RuleSet, type CombatState } from '@/domain'`.
 * The domain has zero React/React-Native dependencies (§02-architecture).
 */
export * from './model';
export { Rand, step, seedFrom } from './rng/rng';
export type { Seed } from './rng/rng';
export { identity, pipe, flow } from './engine/fn';
export {
  RuleSet,
  damageFormula,
  maxHpFormula,
  GENERATION_PARAMS,
  LOOT_PARAMS,
  LEVEL_PARAMS,
  BALANCE_CONSTANTS,
} from './ruleset/ruleset';
export {
  DeckManager,
  draw,
  discard,
  exhaust,
  scry,
  resolveSelection,
  reshuffleDiscardIntoDraw,
  resetPermanentDeck,
} from './deck/deckManager';
export {
  EntityOps,
  maxHp,
  block,
  attackPower,
  takeDamage,
  dealDamage,
  gainBlock,
  gainTempHp,
  applyStatus,
  applyStatusFrom,
  tickStatuses,
  clearBlock,
  cleanupLifetime,
} from './entity/entity';
export type { EntityOp } from './entity/entity';
export { CardResolver, applyCard, compile } from './cardResolver/cardResolver';
export type { CombatantRef } from './cardResolver/cardResolver';
export { STATUS_REGISTRY, getStatusBehavior } from './registry/statusRegistry';
export { EFFECT_HANDLERS } from './registry/effectRegistry';
export { DECK_OP_HANDLERS, getDeckOpHandler } from './registry/deckOpRegistry';
export type { DeckOpHandler } from './registry/deckOpRegistry';
export { CARD_DEFS, getCardDef } from './registry/cardRegistry';
export { ENEMY_DEFS, getEnemyDef } from './registry/enemyRegistry';
export { CARDS } from './content/cards';
export { ENEMIES } from './content/enemies';
export { QUESTIONS } from './content/questions';
export { combatReducer, checkOutcome, withOutcome, runEnemyIntents } from './engine/combat';
export type {
  CombatDeps,
  CombatAction,
  StartCombatAction,
  PlayCardAction,
  EndTurnAction,
} from './engine/combat';
export { runReducer, defaultRunDeps } from './engine/run';
export type { RunAction, RunDeps } from './engine/run';
export { generateLevel, validate, defaultLevelGenDeps } from './engine/level';
export type { LevelGenDeps } from './engine/level';
export {
  rollChestLoot,
  rollBossLoot,
  rollQuestion,
  defaultLootDeps,
  defaultQuestionDeps,
} from './engine/loot';
export type { LootDeps, QuestionDeps, QuestionTemplate } from './engine/loot';
