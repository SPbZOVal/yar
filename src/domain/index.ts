/**
 * Public surface of the pure-TypeScript domain layer.
 *
 * This is the single import point for the future GameStore and UI:
 * `import { DeckManager, RuleSet, type CombatState } from '@/domain'`.
 * The domain has zero React/React-Native dependencies (§02-architecture).
 */
export * from './model';
export { createRng, shuffle } from './rng/rng';
export type { Rng } from './rng/rng';
export {
  RuleSet,
  damageFormula,
  maxHpFormula,
  GENERATION_PARAMS,
  BALANCE_CONSTANTS,
} from './ruleset/ruleset';
export {
  DeckManager,
  shuffleDeck,
  draw,
  discard,
  exhaust,
  reshuffleDiscardIntoDraw,
  resetPermanentDeck,
} from './deck/deckManager';
