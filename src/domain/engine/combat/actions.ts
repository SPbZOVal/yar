/** Combat actions — pure data dispatched into the combat reducer. */
import type { CardInstance, CombatantRef, EnemyDefinition, Entity } from '../../model';
import type { Seed } from '../../rng/rng';

/** Begin a combat: shuffle `deck` into the draw pile and draw the opening hand. */
export interface StartCombatAction {
  readonly type: 'StartCombat';
  readonly player: Entity;
  readonly enemies: readonly EnemyDefinition[];
  readonly deck: readonly CardInstance[];
  readonly seed: Seed;
}

/** Play the card `instanceId` from hand: pay energy, resolve effects, move the card. */
export interface PlayCardAction {
  readonly type: 'PlayCard';
  readonly instanceId: string;
  readonly source: CombatantRef;
  readonly targets: readonly CombatantRef[];
}

/** End the player's turn: run enemy intents, tick statuses, upkeep, and redraw. */
export interface EndTurnAction {
  readonly type: 'EndTurn';
}

/**
 * Resolve a parked scry (`CombatState.pendingSelection`): `instanceIds` names which revealed
 * candidates to take into hand; the rest are discarded. No-op when nothing is pending.
 */
export interface ResolveSelectionAction {
  readonly type: 'ResolveSelection';
  readonly instanceIds: readonly string[];
}

export type CombatAction =
  | StartCombatAction
  | PlayCardAction
  | EndTurnAction
  | ResolveSelectionAction;
