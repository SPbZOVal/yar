/** Barrel for the run reducer: pure reducer + production deps from content/registries. */
import { BALANCE_CONSTANTS, GENERATION_PARAMS } from '../../ruleset/ruleset';
import { CombatPhase } from '../../model';
import type { CombatState, Entity } from '../../model';
import { getCardDef } from '../../registry/cardRegistry';
import { getEnemyDef } from '../../registry/enemyRegistry';
import { combatReducer } from '../combat';
import type { CombatDeps } from '../combat';
import { defaultLevelGenDeps, generateLevel } from '../level';
import type { RunDeps } from './runReducer';

export { runReducer } from './runReducer';
export type { RunAction, RunDeps } from './runReducer';

/** Placeholder state for `StartCombat` — the reducer ignores it and builds combat fresh. */
const EMPTY_COMBAT: CombatState = {
  player: { hp: 0, baseMaxHp: 0, statuses: [] },
  enemies: [],
  drawPile: [],
  hand: [],
  discardPile: [],
  exhaustPile: [],
  energy: 0,
  turn: 0,
  phase: CombatPhase.PlayerTurn,
  rng: 0,
};

/**
 * Production run deps: level generation pre-bound to its content deps, and a combat starter
 * that builds `CombatDeps` from the player + registries and dispatches `StartCombat`.
 */
export const defaultRunDeps = (): RunDeps => ({
  maxDeckSize: BALANCE_CONSTANTS.maxDeckSize,
  generationParams: GENERATION_PARAMS,
  generateLevel: (params, seed) => generateLevel(params, defaultLevelGenDeps(), seed),
  startCombat: (player, enemies, deck, seed) => {
    const combatDeps: CombatDeps = {
      getDef: getCardDef,
      getEnemyDef,
      handSize: player.handSize,
      energyPerTurn: player.energyPerTurn,
    };
    // Project PlayerState → Entity. Use baseMaxHp (NOT player.maxHp): combat re-derives maxHp
    // from baseMaxHp + statuses, so armor / heart bonuses must not be folded in here.
    // TODO(equip-in-combat): decide how armor.maxHpBonus + heart bonuses enter combat.
    const entity: Entity = { hp: player.currentHp, baseMaxHp: player.baseMaxHp, statuses: [] };
    return combatReducer(combatDeps, EMPTY_COMBAT, {
      type: 'StartCombat',
      player: entity,
      enemies,
      deck,
      seed,
    });
  },
});
