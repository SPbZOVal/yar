/** Entities and combat state. */
import type { CardInstance } from './cards';
import type { CombatPhase } from './enums';
import type { Status } from './status';
import type { Seed } from '../rng/rng';

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
  /** Immutable RNG cursor; deck shuffles/draws thread it so a combat replays exactly. */
  readonly rng: Seed;
  /** Present only mid-scry: a parked card selection awaiting a `ResolveSelection` action. */
  readonly pendingSelection?: PendingSelection;
}

/** Addresses a combatant inside a {@link CombatState}: the player, or an enemy by index. */
export type CombatantRef =
  | { readonly side: 'player' }
  | { readonly side: 'enemy'; readonly index: number };

/**
 * A paused, player-driven card selection (interactive scry). A `DeckOp.Scry` effect reveals
 * the top {@link candidateIds} of the draw pile without moving them and parks them here; the
 * combat then waits for a `ResolveSelection` action naming which of them to take. While this is
 * present, `PlayCard`/`EndTurn` are blocked — the player must resolve the selection first.
 */
export interface PendingSelection {
  /** Instance ids revealed off the top of the draw pile, in draw order. */
  readonly candidateIds: readonly string[];
  /** Upper bound on how many candidates the player may take into hand (the rest are discarded). */
  readonly pick: number;
}
