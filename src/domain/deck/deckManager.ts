/**
 * DeckManager — the card-pile lifecycle within a single combat.
 *
 * The card lifecycle is the project's highest-risk subsystem, so this module is
 * deliberately small, pure, and immutable: every function returns a new `CombatState`
 * (or array) and never mutates its inputs. Cards are identified by `instanceId`.
 *
 * Randomness (the reshuffle) flows through the `Rand` cursor stored on `CombatState`
 * (`state.rng`): a reshuffle runs `Rand.shuffle` against it and threads the advanced
 * cursor back into the returned state, so a whole combat replays identically from its
 * starting seed without inventing per-call seeds.
 *
 * Design notes:
 *  - "Bottom of the draw pile": a played Permanent card goes to `discardPile` and only
 *    becomes drawable again after a reshuffle within the same combat — behaviourally
 *    equivalent to a bottom-of-pile insert.
 *  - `discard` / `exhaust` are dumb pile-movers. The policy of WHICH one a played card
 *    uses (Permanent -> discard, SingleUse -> exhaust) belongs to the caller, not here.
 */
import { CardType } from '../model';
import type { CardDefinition, CardInstance, CombatState } from '../model';
import { Rand } from '../rng/rng';

/**
 * Shuffle the `discardPile` back onto the `drawPile` and clear the discard, advancing
 * the RNG cursor. No-op when the discard pile is empty. The reshuffled cards go beneath
 * whatever remains in the draw pile.
 */
export function reshuffleDiscardIntoDraw(state: CombatState): CombatState {
  if (state.discardPile.length === 0) return state;
  const [shuffled, rng] = Rand.run(Rand.shuffle(state.discardPile), state.rng);
  return {
    ...state,
    drawPile: [...state.drawPile, ...shuffled],
    discardPile: [],
    rng,
  };
}

/**
 * Draw up to `n` cards from the top of the `drawPile` into the `hand`.
 * When the draw pile empties mid-draw and the discard pile is non-empty, the discard is
 * reshuffled in and drawing continues; if both piles are empty, drawing stops early (the
 * hand simply gets fewer than `n` cards).
 */
export function draw(state: CombatState, n: number): CombatState {
  let current = state;
  const drawn: CardInstance[] = [];
  for (let i = 0; i < n; i++) {
    if (current.drawPile.length === 0) {
      if (current.discardPile.length === 0) break;
      current = reshuffleDiscardIntoDraw(current);
    }
    const [top, ...rest] = current.drawPile;
    if (top === undefined) break; // unreachable after the guard; satisfies the type checker
    drawn.push(top);
    current = { ...current, drawPile: rest };
  }
  return { ...current, hand: [...current.hand, ...drawn] };
}

/**
 * Move `card` from the `hand` to the `discardPile` (where played Permanent cards live
 * until a reshuffle). No-op if the card is not in hand.
 */
export function discard(state: CombatState, card: CardInstance): CombatState {
  const hand = state.hand.filter((c) => c.instanceId !== card.instanceId);
  if (hand.length === state.hand.length) return state;
  return { ...state, hand, discardPile: [...state.discardPile, card] };
}

/**
 * Move `card` from the `hand` to the `exhaustPile` (where played SingleUse cards go and
 * never return this combat). No-op if the card is not in hand.
 */
export function exhaust(state: CombatState, card: CardInstance): CombatState {
  const hand = state.hand.filter((c) => c.instanceId !== card.instanceId);
  if (hand.length === state.hand.length) return state;
  return { ...state, hand, exhaustPile: [...state.exhaustPile, card] };
}

/**
 * Rebuild the deck for the next combat: only Permanent cards are restored; SingleUse
 * cards are dropped (they live only within a single combat). `getDef` resolves a card's
 * definition, since `CardType` lives on `CardDefinition`, not on `CardInstance`.
 */
export function resetPermanentDeck(
  deck: readonly CardInstance[],
  getDef: (defId: string) => CardDefinition,
): CardInstance[] {
  return deck.filter((card) => getDef(card.defId).type === CardType.Permanent);
}

/** Convenience aggregate matching the class diagram. */
export const DeckManager = {
  draw,
  discard,
  exhaust,
  reshuffleDiscardIntoDraw,
  resetPermanentDeck,
} as const;
