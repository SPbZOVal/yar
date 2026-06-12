/** Enemies and combat state. See docs/architecture/03-data-model.md §7.5. */
import type { CardInstance } from './cards';
import type { CombatPhase } from './enums';

/** An active status (poison, weakness, ...) on a combatant. (§7.5) */
export interface StatusEffect {
  readonly id: string;
  readonly stacks: number;
  readonly remainingTurns: number;
}

/** Anything that can fight: has HP, a per-turn block, and statuses. (§7.5) */
export interface Combatant {
  readonly hp: number;
  readonly maxHp: number;
  /** Temporary shield, reset at the start of each turn. */
  readonly block: number;
  readonly statuses: readonly StatusEffect[];
}

/** A single deterministic enemy action; the player sees it in advance. (§12.3) */
export interface EnemyIntent {
  readonly kind: string;
  readonly value: number;
}

/**
 * Immutable enemy template. Behaviour is a fixed, telegraphed `intents` cycle —
 * no RNG, to keep combat tactical. (§7.5, §12.3)
 */
export interface EnemyDefinition {
  readonly id: string;
  readonly name: string;
  readonly maxHp: number;
  readonly intents: readonly EnemyIntent[];
  readonly isBoss: boolean;
}

/**
 * A run-time enemy. Extends {@link Combatant} and references its
 * {@link EnemyDefinition} via `defId`; `currentIntentIndex` cycles each enemy turn.
 */
export interface EnemyInstance extends Combatant {
  readonly defId: string;
  readonly currentIntentIndex: number;
}

/**
 * Full state of an active combat.
 *
 * Piles (all `CardInstance[]`):
 *  - `drawPile`   — shuffled cards to draw from;
 *  - `hand`       — cards currently playable;
 *  - `discardPile`— played Permanent cards (recycled via reshuffle within the combat);
 *  - `exhaustPile`— played SingleUse cards (gone for the rest of the combat/level).
 *
 * Pile transitions live in DeckManager; see §10.1.
 */
export interface CombatState {
  readonly player: Combatant;
  readonly enemies: readonly EnemyInstance[];
  readonly drawPile: readonly CardInstance[];
  readonly hand: readonly CardInstance[];
  readonly discardPile: readonly CardInstance[];
  readonly exhaustPile: readonly CardInstance[];
  readonly energy: number;
  readonly turn: number;
  readonly phase: CombatPhase;
}
