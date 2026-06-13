/**
 * CardResolver — turn a played card into a new CombatState, purely.
 *
 * Resolution is a generic fold: each effect is dispatched by kind through the effect
 * registry (no per-kind switch here). The resolver supplies the `ResolveCtx` — how to
 * read/write a combatant by ref — and folds the card's effects left to right. It
 * deliberately does NOT spend energy or choose targets; that is the CombatEngine's job.
 */
import type {
  ApplyStatusEffect,
  CardDefinition,
  CombatState,
  CombatantRef,
  Effect,
  Entity,
  EntityOp,
  ResolveCtx,
} from '../model';
import { EFFECT_HANDLERS } from '../registry/effectRegistry';
import { applyStatusFrom } from '../entity/entity';

export type { CombatantRef };

/** Read the entity a ref points at, or `undefined` for an out-of-range enemy index. */
function getEntity(state: CombatState, ref: CombatantRef): Entity | undefined {
  return ref.side === 'player' ? state.player : state.enemies[ref.index]?.entity;
}

/** Apply an {@link EntityOp} to the entity a ref points at. No-op for a missing enemy. */
function updateEntity(state: CombatState, ref: CombatantRef, op: EntityOp): CombatState {
  if (ref.side === 'player') return { ...state, player: op(state.player) };
  if (state.enemies[ref.index] === undefined) return state;
  const enemies = state.enemies.map((enemy, i) =>
    i === ref.index ? { ...enemy, entity: op(enemy.entity) } : enemy,
  );
  return { ...state, enemies };
}

/**
 * Compile a single entity effect into an {@link EntityOp} closing over the `source`
 * entity (its attack power scales `Damage`). Public helper for one-off resolution.
 */
export function compile(effect: ApplyStatusEffect, source: Entity): EntityOp {
  return (e) =>
    applyStatusFrom(e, effect.status, effect.value, effect.lifetime, source, effect.duration);
}

/** Dispatch one effect through the registry. The single, sound cast is localized here. */
function applyEffect(state: CombatState, effect: Effect, ctx: ResolveCtx): CombatState {
  // EFFECT_HANDLERS is keyed by EffectKind, so the handler at effect.kind takes exactly
  // this effect's payload; TS can't correlate the runtime key, so we bridge once.
  const handler = EFFECT_HANDLERS[effect.kind] as (
    e: Effect,
    c: ResolveCtx,
  ) => (s: CombatState) => CombatState;
  return handler(effect, ctx)(state);
}

/**
 * Apply every effect of a played `card`, folded left-to-right, to produce a new
 * CombatState. `source` is the caster; `targets` are the recipients for `Targets`
 * effects. The source entity is re-read from the evolving state for each effect, so a
 * self-buff earlier in the card boosts a later hit.
 */
export function applyCard(
  state: CombatState,
  card: CardDefinition,
  source: CombatantRef,
  targets: readonly CombatantRef[],
): CombatState {
  const ctx: ResolveCtx = { source, targets, getEntity, updateEntity };
  return card.effects.reduce((s, effect) => applyEffect(s, effect, ctx), state);
}

/** Convenience aggregate matching the class diagram. */
export const CardResolver = {
  applyCard,
  compile,
} as const;
