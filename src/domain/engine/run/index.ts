/** Barrel for the run reducer: pure reducer + production deps from content/registries. */
import { BALANCE_CONSTANTS, GENERATION_PARAMS } from '../../ruleset/ruleset';
import { CombatPhase, Lifetime, StatusKind } from '../../model';
import type { CombatState, Entity, PlayerState, Status } from '../../model';
import { getCardDef } from '../../registry/cardRegistry';
import { getEnemyDef } from '../../registry/enemyRegistry';
import { STARTER_DECK } from '../../content/starterDeck';
import { combatReducer } from '../combat';
import type { CombatDeps } from '../combat';
import { defaultLevelGenDeps, generateLevel } from '../level';
import { defaultLootDeps, rollBossLoot, rollChestLoot } from '../loot';
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
 * Project `PlayerState` → combat `Entity`. Equipment / meta bonuses enter combat as
 * statuses — the model's single source of truth for modifiers — so combat re-derives
 * `maxHp` (baseMaxHp + MaxHpUp) and attack (Σ AttackUp) consistently:
 *  - `armor.maxHpBonus` + "+heart" specials → one `MaxHpUp` (their combined contribution is
 *    `player.maxHp - player.baseMaxHp`), keeping derived maxHp == `player.maxHp`;
 *  - `weapon.attackBonus` → `AttackUp`, so the weapon finally boosts outgoing damage.
 * `baseMaxHp` stays the player's base (NOT `player.maxHp`) so the bonuses aren't double-counted.
 */
function projectPlayer(player: PlayerState): Entity {
  const statuses: Status[] = [];
  const maxHpBonus = player.maxHp - player.baseMaxHp;
  if (maxHpBonus > 0) {
    statuses.push({ kind: StatusKind.MaxHpUp, stacks: maxHpBonus, lifetime: Lifetime.Run });
  }
  if (player.weapon.attackBonus > 0) {
    statuses.push({
      kind: StatusKind.AttackUp,
      stacks: player.weapon.attackBonus,
      lifetime: Lifetime.Run,
    });
  }
  // TODO(passive-block): armor.blockBonus needs a per-turn reapply (clearBlock strips Block
  // at the start of each turn), so it is not projected as a one-time status here.
  return { hp: player.currentHp, baseMaxHp: player.baseMaxHp, statuses };
}

/**
 * Production run deps: starter deck + level generation + loot rollers pre-bound to their
 * content deps, and a combat starter that builds `CombatDeps` from the player + registries.
 */
export const defaultRunDeps = (): RunDeps => {
  const lootDeps = defaultLootDeps();
  return {
    maxDeckSize: BALANCE_CONSTANTS.maxDeckSize,
    generationParams: GENERATION_PARAMS,
    starterCards: STARTER_DECK,
    generateLevel: (params, seed) => generateLevel(params, defaultLevelGenDeps(), seed),
    startCombat: (player, enemies, deck, seed) => {
      const combatDeps: CombatDeps = {
        getDef: getCardDef,
        getEnemyDef,
        handSize: player.handSize,
        energyPerTurn: player.energyPerTurn,
      };
      return combatReducer(combatDeps, EMPTY_COMBAT, {
        type: 'StartCombat',
        player: projectPlayer(player),
        enemies,
        deck,
        seed,
      });
    },
    rollChestLoot: (seed) => rollChestLoot(lootDeps, seed),
    rollBossLoot: (seed, isEndBoss) => rollBossLoot(lootDeps, seed, isEndBoss),
  };
};
