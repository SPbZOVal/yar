/**
 * Effect registry — the data-driven behavior of each card-effect kind.
 *
 * `applyCard` folds a card's effects through this table; there is no per-kind switch.
 * Each handler is typed to its own payload (via the mapped type over the `Effect`
 * union). An entity effect (`ApplyStatus`) builds an {@link EntityOp} and routes it to
 * the caster (`Self`) or the chosen targets; a deck effect delegates to the deck-op
 * registry. Adding an effect kind is adding a `EffectKind` literal + one entry.
 */
import { TargetType } from '../model';
import type { EffectHandlerMap, EntityOp } from '../model';
import { applyStatusFrom } from '../entity/entity';
import { getDeckOpHandler } from './deckOpRegistry';

export const EFFECT_HANDLERS: EffectHandlerMap = {
  ApplyStatus: (effect, ctx) => (state) => {
    const source = ctx.getEntity(state, ctx.source);
    if (source === undefined) return state;
    const op: EntityOp = (e) =>
      applyStatusFrom(e, effect.status, effect.value, effect.lifetime, source, effect.duration);
    const recipients = effect.target === TargetType.Self ? [ctx.source] : ctx.targets;
    return recipients.reduce((s, ref) => ctx.updateEntity(s, ref, op), state);
  },
  DeckManipulation: (effect) => (state) => getDeckOpHandler(effect.op)(state, effect.value),
};
