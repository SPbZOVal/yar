/**
 * Intent registry — the data-driven behavior of each enemy-intent kind.
 *
 * `runEnemyIntents` dispatches an enemy's telegraphed `intent.kind` through this table
 * instead of switching on the string; adding an intent kind is adding one entry, with no
 * change to the turn loop. Handlers reuse the SAME entity ops as the player's cards, so an
 * enemy "attack" and a player attack share one code path. Keyed by `string` (intents are
 * free-form content tags), so an unknown kind resolves to `undefined` and the turn loop
 * simply advances the cycle.
 */
import { Lifetime, StatusKind } from '../model';
import type { CombatState, EntityOp } from '../model';
import { applyStatus, applyStatusFrom, dealDamage, gainBlock } from '../entity/entity';

/** Resolve one enemy's intent (magnitude `value`) into a new combat state. Pure. */
export type IntentHandler = (state: CombatState, enemyIndex: number, value: number) => CombatState;

/** Replace enemy `i`'s entity via a pure transform; no-op for an out-of-range index. */
function updateEnemy(state: CombatState, i: number, op: EntityOp): CombatState {
  if (state.enemies[i] === undefined) return state;
  return {
    ...state,
    enemies: state.enemies.map((e, j) => (j === i ? { ...e, entity: op(e.entity) } : e)),
  };
}

export const INTENT_HANDLERS: Record<string, IntentHandler> = {
  // Hit the player, scaled by the acting enemy's attack power.
  attack: (state, i, value) => {
    const source = state.enemies[i]?.entity;
    return source === undefined
      ? state
      : { ...state, player: dealDamage(source, value)(state.player) };
  },
  // Self shield for the turn.
  block: (state, i, value) => updateEnemy(state, i, (e) => gainBlock(e, value)),
  // Self AttackUp buff: grows this enemy's outgoing damage for the rest of the fight.
  buff: (state, i, value) =>
    updateEnemy(state, i, (e) => applyStatus(e, StatusKind.AttackUp, value, Lifetime.Fight)),
  // Poison the player: `value` stacks decaying over `value` turns (bypasses Block per tick).
  poison: (state, i, value) => {
    const source = state.enemies[i]?.entity;
    return source === undefined
      ? state
      : {
          ...state,
          player: applyStatusFrom(
            state.player,
            StatusKind.Poison,
            value,
            Lifetime.Fight,
            source,
            value,
          ),
        };
  },
};

/** Look up an intent kind's handler, or `undefined` for an unknown (content) kind. */
export const getIntentHandler = (kind: string): IntentHandler | undefined => INTENT_HANDLERS[kind];
