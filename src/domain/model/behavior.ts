/**
 * Behavior contracts that make statuses data-driven (types only).
 *
 * The engine interprets statuses generically by looking each kind up in a registry
 * of {@link StatusBehavior} values; adding a status is adding one such entry, with no
 * change to the engine's stat math or tick loop.
 */
import type { CombatState, CombatantRef, Entity } from './combat';
import type { Effect } from './cards';
import type { EffectKind } from './enums';
import type { Lifetime, Status } from './status';

/** A pure transformation of one entity's stats — the atom of effect resolution. */
export type EntityOp = (e: Entity) => Entity;

/** Derived-stat contribution of a single status instance (all keys optional). */
export interface StatContribution {
  readonly attack?: number;
  readonly block?: number;
  readonly maxHp?: number;
}

/** A derived-stat a reader can ask for. */
export type StatKey = keyof StatContribution;

/** Context a status `apply` strategy needs: the request plus the source entity. */
export interface StatusApplyCtx {
  readonly source: Entity;
  readonly stacks: number;
  readonly lifetime: Lifetime;
  readonly duration?: number;
}

/**
 * Everything the generic engine needs to interpret one status kind.
 *  - `stat`    — per-instance contribution to derived stats (maxHp/block/attack).
 *  - `onTick`  — per-turn transform of the owner (poison, regen, …).
 *  - `apply`   — how `stacks` are applied to a recipient; absent ⇒ the default
 *                store/merge. `Damage` consumes instantly; `TempHp` heals + raises max.
 */
export interface StatusBehavior {
  readonly defaultLifetime: Lifetime;
  readonly stat?: (s: Status) => StatContribution;
  readonly onTick?: (e: Entity, s: Status) => Entity;
  readonly apply?: (e: Entity, ctx: StatusApplyCtx) => Entity;
}

/**
 * What an effect handler needs to act on combat state: who cast the card, the chosen
 * targets, and how to read/write a combatant entity by {@link CombatantRef}. Pure.
 */
export interface ResolveCtx {
  readonly source: CombatantRef;
  readonly targets: readonly CombatantRef[];
  readonly getEntity: (state: CombatState, ref: CombatantRef) => Entity | undefined;
  readonly updateEntity: (state: CombatState, ref: CombatantRef, op: EntityOp) => CombatState;
}

/**
 * A handler for one effect kind: it receives THAT kind's payload (narrowed via the
 * discriminated union) plus the {@link ResolveCtx}, and returns a state transform.
 */
export type EffectHandler<K extends EffectKind> = (
  effect: Extract<Effect, { kind: K }>,
  ctx: ResolveCtx,
) => (state: CombatState) => CombatState;

/** Exhaustive table: one handler per effect kind, each typed to its own payload. */
export type EffectHandlerMap = { [K in EffectKind]: EffectHandler<K> };
