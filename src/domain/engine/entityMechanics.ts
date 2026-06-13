/**
 * Entity stat mechanics — the registry-free primitives.
 *
 * These are the low-level, pure building blocks that the status registry's behavior
 * strategies and the policy-level entity ops are both built on. Nothing here imports
 * the registry, so the dependency graph stays acyclic: registry → mechanics, policy →
 * registry + mechanics, mechanics → nothing.
 *
 * "Block is the canonical shield": {@link damageInto} mitigates with `Block`-kind
 * stacks directly, which is the one stat assumption baked in at this layer.
 */
import { Lifetime, StatusKind } from '../model';
import type { Entity, Status } from '../model';
import { damageFormula } from '../ruleset/ruleset';

/** Sum the stacks of every status of `kind` on `e`. */
export function sumStacks(e: Entity, kind: StatusKind): number {
  return e.statuses.reduce((acc, s) => (s.kind === kind ? acc + s.stacks : acc), 0);
}

/** Build a status, omitting `remainingTurns` when undefined (exactOptionalPropertyTypes). */
export function makeStatus(
  kind: StatusKind,
  stacks: number,
  lifetime: Lifetime,
  remainingTurns?: number,
): Status {
  return remainingTurns === undefined
    ? { kind, stacks, lifetime }
    : { kind, stacks, lifetime, remainingTurns };
}

/** The longer of two optional durations; `undefined` means "no decay". */
export function maxDuration(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.max(a, b);
}

/** Spend `amount` stacks of `kind`, draining statuses in order and dropping emptied ones. */
export function reduceStatus(e: Entity, kind: StatusKind, amount: number): Entity {
  if (amount <= 0) return e;
  let remaining = amount;
  const statuses: Status[] = [];
  for (const s of e.statuses) {
    if (s.kind !== kind || remaining <= 0) {
      statuses.push(s);
      continue;
    }
    const spent = Math.min(s.stacks, remaining);
    remaining -= spent;
    const left = s.stacks - spent;
    if (left > 0) statuses.push({ ...s, stacks: left });
  }
  return { ...e, statuses };
}

/**
 * Add a status, merging into an existing one of the same kind AND lifetime (stacks
 * sum, `remainingTurns` becomes the longer). Does not touch HP — the caller re-clamps
 * if the cap moved. Assumes `stacks > 0`.
 */
export function storeStatus(
  e: Entity,
  kind: StatusKind,
  stacks: number,
  lifetime: Lifetime,
  duration?: number,
): Entity {
  let merged = false;
  const statuses = e.statuses.map((s) => {
    if (!merged && s.kind === kind && s.lifetime === lifetime) {
      merged = true;
      return makeStatus(kind, s.stacks + stacks, lifetime, maxDuration(s.remainingTurns, duration));
    }
    return s;
  });
  return merged
    ? { ...e, statuses }
    : { ...e, statuses: [...e.statuses, makeStatus(kind, stacks, lifetime, duration)] };
}

/** Clamp `hp` into `[0, cap]`. Returns the same reference when nothing changes. */
export function clampHpTo(e: Entity, cap: number): Entity {
  const hp = Math.min(cap, Math.max(0, e.hp));
  return hp === e.hp ? e : { ...e, hp };
}

/** Heal `amount` HP, capped at `cap`. No-op for non-positive amounts. */
export function heal(e: Entity, amount: number, cap: number): Entity {
  if (amount <= 0) return e;
  const hp = Math.min(cap, e.hp + amount);
  return hp === e.hp ? e : { ...e, hp };
}

/**
 * Apply `amount` raw damage: `Block` stacks absorb first, then the remainder reduces
 * HP (never below 0). HP loss comes from `RuleSet.damageFormula`, the single tuning
 * point. The caller folds in any attacker scaling before calling.
 */
export function damageInto(e: Entity, amount: number): Entity {
  const blk = sumStacks(e, StatusKind.Block);
  const incoming = Math.max(0, amount);
  const absorbed = Math.min(blk, incoming);
  const hpLoss = damageFormula(amount, 0, 0, blk);
  const afterBlock = reduceStatus(e, StatusKind.Block, absorbed);
  return { ...afterBlock, hp: Math.max(0, afterBlock.hp - hpLoss) };
}

/** Status lifetime ordering: a cleanup boundary clears everything at or below it. */
export const LIFETIME_ORDER: Record<Lifetime, number> = {
  [Lifetime.Instant]: -1,
  [Lifetime.Fight]: 0,
  [Lifetime.Run]: 1,
  [Lifetime.Life]: 2,
  [Lifetime.Permanent]: 3,
};
