/**
 * Entity stat operations — the policy layer of effect resolution.
 *
 * Every operation is a pure, immutable transformation `Entity -> Entity` (damage is a
 * source entity *producing* an {@link EntityOp} applied to the target, so attacker and
 * target never meet in one call). All per-kind behavior is data-driven: the derived
 * readers and ops consult `STATUS_REGISTRY` rather than switching on a kind, so adding
 * a status changes nothing here. Low-level math lives in registry-free
 * `engine/entityMechanics`; this module reads the registry, mechanics never do.
 */
import { Lifetime, StatusKind } from '../model';
import type { Entity, EntityOp } from '../model';
import { STATUS_REGISTRY } from '../registry/statusRegistry';
import { LIFETIME_ORDER, clampHpTo, damageInto, storeStatus } from '../engine/entityMechanics';

export type { EntityOp };

interface DerivedStats {
  readonly attack: number;
  readonly block: number;
  readonly maxHp: number;
}

/** One pass over `e`'s statuses, folding every kind's registered stat contribution. */
function deriveStats(e: Entity): DerivedStats {
  let attack = 0;
  let blk = 0;
  let max = e.baseMaxHp;
  for (const s of e.statuses) {
    const c = STATUS_REGISTRY[s.kind].stat?.(s);
    if (c === undefined) continue;
    attack += c.attack ?? 0;
    blk += c.block ?? 0;
    max += c.maxHp ?? 0;
  }
  return { attack, block: blk, maxHp: max };
}

/** Effective max HP: `baseMaxHp` plus every max-raising status (MaxHpUp, TempHp). */
export const maxHp = (e: Entity): number => deriveStats(e).maxHp;

/** Total Block currently shielding `e`. */
export const block = (e: Entity): number => deriveStats(e).block;

/** Outgoing-damage bonus contributed by `e`'s statuses (weapon + strength). */
export const attackPower = (e: Entity): number => deriveStats(e).attack;

/** Damage an entity directly receives: Block absorbs, the remainder reduces HP. */
export function takeDamage(e: Entity, amount: number): Entity {
  return damageInto(e, amount);
}

/**
 * A source entity produces a damage op carrying its resolved hit (`base` plus the
 * source's own `attackPower`). Applying the op to a target deals that damage.
 */
export function dealDamage(source: Entity, base: number): EntityOp {
  const amount = base + attackPower(source);
  return (target) => damageInto(target, amount);
}

/**
 * Apply a status to `target` from a given `source`. Kinds with an `apply` strategy
 * (Damage scales with the source's attack, TempHp heals) use it; the rest store/merge
 * and re-clamp HP. No-op for non-positive `stacks`.
 */
export function applyStatusFrom(
  target: Entity,
  kind: StatusKind,
  stacks: number,
  lifetime: Lifetime,
  source: Entity,
  duration?: number,
): Entity {
  if (stacks <= 0) return target;
  const behavior = STATUS_REGISTRY[kind];
  if (behavior.apply) {
    return behavior.apply(target, {
      source,
      stacks,
      lifetime,
      ...(duration !== undefined ? { duration } : {}),
    });
  }
  const stored = storeStatus(target, kind, stacks, lifetime, duration);
  return clampHpTo(stored, maxHp(stored));
}

/** Apply a status to `e` from itself (self-buff / debuff). No-op for non-positive `stacks`. */
export function applyStatus(
  e: Entity,
  kind: StatusKind,
  stacks: number,
  lifetime: Lifetime,
  duration?: number,
): Entity {
  return applyStatusFrom(e, kind, stacks, lifetime, e, duration);
}

/** Add `value` fight-scoped Block to `e`. No-op for non-positive values. */
export function gainBlock(e: Entity, value: number): Entity {
  return applyStatus(e, StatusKind.Block, value, Lifetime.Fight);
}

/** Grant `value` temporary HP (heal + fight-scoped max bonus). No-op for non-positive values. */
export function gainTempHp(e: Entity, value: number): Entity {
  return applyStatus(e, StatusKind.TempHp, value, Lifetime.Fight);
}

/**
 * Advance one turn tick: run every status' `onTick` (poison, …), decrement statuses
 * that decay by turns, drop expired ones, and re-clamp HP.
 */
export function tickStatuses(e: Entity): Entity {
  const afterTick = e.statuses.reduce(
    (acc, s) => STATUS_REGISTRY[s.kind].onTick?.(acc, s) ?? acc,
    e,
  );
  const statuses = afterTick.statuses
    .map((s) =>
      s.remainingTurns === undefined ? s : { ...s, remainingTurns: s.remainingTurns - 1 },
    )
    .filter((s) => s.remainingTurns === undefined || s.remainingTurns > 0);
  const ticked: Entity = { ...afterTick, statuses };
  return clampHpTo(ticked, maxHp(ticked));
}

/** Reset Block (start-of-turn). Returns the same reference when there is no Block. */
export function clearBlock(e: Entity): Entity {
  const statuses = e.statuses.filter((s) => s.kind !== StatusKind.Block);
  return statuses.length === e.statuses.length ? e : { ...e, statuses };
}

/**
 * Remove every status whose lifetime ends at `boundary` or sooner (Instant < Fight <
 * Run < Life < Permanent), re-clamping HP since a removed max-raising status lowers the
 * cap. Returns the same reference when nothing is removed.
 */
export function cleanupLifetime(e: Entity, boundary: Lifetime): Entity {
  const cutoff = LIFETIME_ORDER[boundary];
  const statuses = e.statuses.filter((s) => LIFETIME_ORDER[s.lifetime] > cutoff);
  if (statuses.length === e.statuses.length) return e;
  const cleaned: Entity = { ...e, statuses };
  return clampHpTo(cleaned, maxHp(cleaned));
}

/** Convenience aggregate so callers can `import { EntityOps }`. */
export const EntityOps = {
  maxHp,
  block,
  attackPower,
  takeDamage,
  dealDamage,
  gainBlock,
  gainTempHp,
  applyStatus,
  tickStatuses,
  clearBlock,
  cleanupLifetime,
} as const;
