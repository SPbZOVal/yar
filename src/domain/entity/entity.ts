/**
 * Entity stat operations — the pure, immutable core of effect resolution.
 *
 * An entity is just fightable stats (`hp`, `baseMaxHp`, a list of typed statuses).
 * Every operation here is a pure transformation `Entity -> Entity`: it returns a new
 * entity and never mutates its inputs, with no randomness. Damage stays single-entity
 * too — a source entity *produces* a damage {@link EntityOp} that carries its resolved
 * hit, and that op is later applied to the target, so the attacker and target never
 * meet in one call. This is the "a card applied to an entity transforms its stats"
 * shape the resolver builds on.
 *
 * All combat modifiers are statuses, so effective values are derived on read rather
 * than stored: `maxHp = baseMaxHp + MaxHpUp + TempHp`, `block = Σ Block`,
 * `attackPower = Σ AttackUp`. This keeps `statuses` the single source of truth and
 * means callers never pass a weapon bonus or status modifier — those are read off
 * the entity itself.
 */
import { Lifetime, StatusKind } from '../model';
import type { Entity, Status } from '../model';
import { damageFormula } from '../ruleset/ruleset';

/** A pure transformation of one entity's stats — the atom of effect resolution. */
export type EntityOp = (e: Entity) => Entity;

// --- internal helpers --------------------------------------------------------

/** Sum the stacks of every status of `kind` on `e`. */
function sumStacks(e: Entity, kind: StatusKind): number {
  return e.statuses.reduce((acc, s) => (s.kind === kind ? acc + s.stacks : acc), 0);
}

/** Build a status, omitting `remainingTurns` when undefined (exactOptionalPropertyTypes). */
function makeStatus(
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
function maxDuration(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.max(a, b);
}

/** Spend `amount` stacks of `kind`, draining statuses in order and dropping emptied ones. */
function reduceStatus(e: Entity, kind: StatusKind, amount: number): Entity {
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

/** Clamp `hp` into `[0, maxHp(e)]` after a change that may have lowered the cap. */
function clampHp(e: Entity): Entity {
  const hp = Math.min(maxHp(e), Math.max(0, e.hp));
  return hp === e.hp ? e : { ...e, hp };
}

/** Order used by {@link cleanupLifetime}: a boundary clears everything at or below it. */
const LIFETIME_ORDER: Record<Lifetime, number> = {
  [Lifetime.Fight]: 0,
  [Lifetime.Run]: 1,
  [Lifetime.Life]: 2,
  [Lifetime.Permanent]: 3,
};

// --- derived readers ---------------------------------------------------------

/** Effective max HP: `baseMaxHp` plus every max-raising status (MaxHpUp, TempHp). */
export function maxHp(e: Entity): number {
  return e.baseMaxHp + sumStacks(e, StatusKind.MaxHpUp) + sumStacks(e, StatusKind.TempHp);
}

/** Total Block currently shielding `e`. */
export function block(e: Entity): number {
  return sumStacks(e, StatusKind.Block);
}

/** Outgoing-damage bonus contributed by `e`'s statuses (weapon + strength). */
export function attackPower(e: Entity): number {
  return sumStacks(e, StatusKind.AttackUp);
}

// --- operations --------------------------------------------------------------

/**
 * Damage an entity directly receives: its Block absorbs first, then the remainder
 * reduces HP (never below 0). The exact HP loss comes from `RuleSet.damageFormula`,
 * so the formula stays the single tuning point.
 */
export function takeDamage(e: Entity, amount: number): Entity {
  const incoming = Math.max(0, amount);
  const absorbed = Math.min(block(e), incoming);
  const hpLoss = damageFormula(amount, 0, 0, block(e));
  const afterBlock = reduceStatus(e, StatusKind.Block, absorbed);
  return { ...afterBlock, hp: Math.max(0, afterBlock.hp - hpLoss) };
}

/**
 * A source entity produces a damage op carrying its resolved hit (`base` plus the
 * source's own `attackPower`). Applying the returned {@link EntityOp} to a target
 * deals that damage — the two entities never appear in one call.
 */
export function dealDamage(source: Entity, base: number): EntityOp {
  const amount = base + attackPower(source);
  return (target) => takeDamage(target, amount);
}

/** Add `value` fight-scoped Block to `e`. No-op for non-positive values. */
export function gainBlock(e: Entity, value: number): Entity {
  return applyStatus(e, StatusKind.Block, value, Lifetime.Fight);
}

/**
 * Grant `value` temporary HP: a fight-scoped bonus to max HP plus an equal heal, so
 * current HP rises above the normal cap and is restored at fight end (when the
 * fight-lifetime TempHp status is cleaned up). No-op for non-positive values.
 */
export function gainTempHp(e: Entity, value: number): Entity {
  if (value <= 0) return e;
  const raised = applyStatus(e, StatusKind.TempHp, value, Lifetime.Fight);
  return { ...raised, hp: Math.min(maxHp(raised), raised.hp + value) };
}

/**
 * Add a status to `e`. Statuses of the same `kind` and `lifetime` merge (stacks sum,
 * `remainingTurns` becomes the longer of the two); other combinations stay separate.
 * No-op for non-positive `stacks`. HP is re-clamped in case the cap rose.
 */
export function applyStatus(
  e: Entity,
  kind: StatusKind,
  stacks: number,
  lifetime: Lifetime,
  duration?: number,
): Entity {
  if (stacks <= 0) return e;
  let merged = false;
  const statuses = e.statuses.map((s) => {
    if (!merged && s.kind === kind && s.lifetime === lifetime) {
      merged = true;
      return makeStatus(kind, s.stacks + stacks, lifetime, maxDuration(s.remainingTurns, duration));
    }
    return s;
  });
  const next: Entity = merged
    ? { ...e, statuses }
    : { ...e, statuses: [...e.statuses, makeStatus(kind, stacks, lifetime, duration)] };
  return clampHp(next);
}

/**
 * Advance one turn tick: apply Poison damage, decrement every status that decays by
 * turns, and drop those that reach 0. HP is re-clamped after expiries.
 */
export function tickStatuses(e: Entity): Entity {
  const poison = sumStacks(e, StatusKind.Poison);
  const statuses = e.statuses
    .map((s) =>
      s.remainingTurns === undefined ? s : { ...s, remainingTurns: s.remainingTurns - 1 },
    )
    .filter((s) => s.remainingTurns === undefined || s.remainingTurns > 0);
  const ticked: Entity = { ...e, statuses, hp: Math.max(0, e.hp - poison) };
  return clampHp(ticked);
}

/** Reset Block (start-of-turn). Returns the same reference when there is no Block. */
export function clearBlock(e: Entity): Entity {
  const statuses = e.statuses.filter((s) => s.kind !== StatusKind.Block);
  return statuses.length === e.statuses.length ? e : { ...e, statuses };
}

/**
 * Remove every status whose lifetime ends at `boundary` or sooner (Fight < Run <
 * Life < Permanent): a Fight boundary clears only Fight statuses, a Run boundary
 * clears Fight + Run, and so on. HP is re-clamped since removing a max-raising
 * status lowers the cap. Returns the same reference when nothing is removed.
 */
export function cleanupLifetime(e: Entity, boundary: Lifetime): Entity {
  const cutoff = LIFETIME_ORDER[boundary];
  const statuses = e.statuses.filter((s) => LIFETIME_ORDER[s.lifetime] > cutoff);
  if (statuses.length === e.statuses.length) return e;
  return clampHp({ ...e, statuses });
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
