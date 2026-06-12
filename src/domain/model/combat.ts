/** Entities and combat state. */
import type { CardInstance } from './cards';
import type { CombatPhase } from './enums';
import type { Status } from './status';

/**
 * Anything that can fight, reduced to pure stats: current HP, a base max HP, and a
 * list of typed {@link Status}es. The player and every enemy are both Entities.
 *
 * Effective values are **derived** from `statuses` (see the entity-operations
 * module): `maxHp = baseMaxHp + MaxHpUp + TempHp`, `block = Σ Block`,
 * `attackPower = Σ AttackUp`. So `hp` and `baseMaxHp` are the only stored numbers —
 * statuses are the single source of truth for every modifier.
 */
export interface Entity {
  readonly hp: number;
  readonly baseMaxHp: number;
  readonly statuses: readonly Status[];
}

/** A single deterministic enemy action; the player sees it in advance. */
export interface EnemyIntent {
  readonly kind: string;
  readonly value: number;
}

/**
 * Immutable enemy template. Behaviour is a fixed, telegraphed `intents` cycle —
 * no RNG, to keep combat tactical. `maxHp` seeds the instance's `baseMaxHp`.
 */
export interface EnemyDefinition {
  readonly id: string;
  readonly name: string;
  readonly maxHp: number;
  readonly intents: readonly EnemyIntent[];
  readonly isBoss: boolean;
}

/**
 * A run-time enemy: an {@link Entity} plus its template reference. `defId` resolves
 * the {@link EnemyDefinition}; `currentIntentIndex` cycles each enemy turn.
 * Composition (not inheritance) keeps the stat operations working on plain
 * `Entity` values regardless of who owns them.
 */
export interface EnemyInstance {
  readonly entity: Entity;
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
 * Pile transitions live in DeckManager.
 */
export interface CombatState {
  readonly player: Entity;
  readonly enemies: readonly EnemyInstance[];
  readonly drawPile: readonly CardInstance[];
  readonly hand: readonly CardInstance[];
  readonly discardPile: readonly CardInstance[];
  readonly exhaustPile: readonly CardInstance[];
  readonly energy: number;
  readonly turn: number;
  readonly phase: CombatPhase;
}
