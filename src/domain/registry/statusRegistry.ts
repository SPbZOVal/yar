/**
 * Status registry — the data-driven behavior of every status kind.
 *
 * The engine never switches on a status kind; it looks the kind up here. Adding a
 * status is adding one entry (and a `StatusKind` literal) — the `satisfies
 * Record<StatusKind, StatusBehavior>` below fails to compile until the entry exists,
 * and the generic readers/ops in `engine/entityOps` pick it up with no change.
 *
 * Entries call only registry-free mechanics (`engine/entityMechanics`), so there is
 * no registry ↔ engine cycle. The local `statSum`/`localMaxHp` folds reference
 * `STATUS_REGISTRY` itself — safe, since they run only when a behavior is *called*,
 * never during module initialization.
 */
import { Lifetime, StatusKind } from '../model';
import type {
  Entity,
  StatContribution,
  StatKey,
  Status,
  StatusApplyCtx,
  StatusBehavior,
} from '../model';
import { damageInto, heal, storeStatus } from '../engine/entityMechanics';

/** Sum a derived stat across `e`'s statuses, via each kind's registered contribution. */
const statSum = (e: Entity, key: StatKey): number =>
  e.statuses.reduce((acc, s) => acc + (STATUS_REGISTRY[s.kind].stat?.(s)?.[key] ?? 0), 0);

const localMaxHp = (e: Entity): number => e.baseMaxHp + statSum(e, 'maxHp');

export const STATUS_REGISTRY: Record<StatusKind, StatusBehavior> = {
  // One-time damage: the source's attack scaling is folded in here; Block absorbs.
  [StatusKind.Damage]: {
    defaultLifetime: Lifetime.Instant,
    apply: (e: Entity, ctx: StatusApplyCtx): Entity =>
      damageInto(e, Math.max(0, ctx.stacks) + statSum(ctx.source, 'attack')),
  },
  // Shield: absorbs damage (consumed by `damageInto`); reset at start of turn.
  [StatusKind.Block]: {
    defaultLifetime: Lifetime.Fight,
    stat: (s: Status): StatContribution => ({ block: s.stacks }),
  },
  // Temporary HP: a fight-scoped max bonus plus a heal, so HP can exceed the normal max.
  [StatusKind.TempHp]: {
    defaultLifetime: Lifetime.Fight,
    stat: (s: Status): StatContribution => ({ maxHp: s.stacks }),
    apply: (e: Entity, ctx: StatusApplyCtx): Entity => {
      const raised = storeStatus(e, StatusKind.TempHp, ctx.stacks, ctx.lifetime);
      return heal(raised, ctx.stacks, localMaxHp(raised));
    },
  },
  // Outgoing-damage buff (weapon bonus, strength): summed as attack.
  [StatusKind.AttackUp]: {
    defaultLifetime: Lifetime.Fight,
    stat: (s: Status): StatContribution => ({ attack: s.stacks }),
  },
  // Max-HP bonus ("+heart").
  [StatusKind.MaxHpUp]: {
    defaultLifetime: Lifetime.Permanent,
    stat: (s: Status): StatContribution => ({ maxHp: s.stacks }),
  },
  // Poison: deals `stacks` damage per turn tick, bypassing Block (canonical behavior).
  [StatusKind.Poison]: {
    defaultLifetime: Lifetime.Fight,
    onTick: (e: Entity, s: Status): Entity => ({ ...e, hp: Math.max(0, e.hp - s.stacks) }),
  },
  // Weapon upgrade marker carried by the player entity.
  [StatusKind.WeaponTier]: {
    defaultLifetime: Lifetime.Life,
  },
};

/** Look up a kind's behavior. (Keyed by the exact union, so never undefined.) */
export const getStatusBehavior = (kind: StatusKind): StatusBehavior => STATUS_REGISTRY[kind];
