/**
 * DeckManager — the card-pile lifecycle within a single combat (§10.1, §5).
 *
 * The card lifecycle is the project's highest-risk subsystem (§13.2), so this
 * module is deliberately small, pure, and immutable: every function returns a new
 * `CombatState` (or array) and never mutates its inputs. Cards are identified by
 * `instanceId`.
 *
 * Design notes:
 *  - "Bottom of the draw pile": the glossary/§10.1 diagram describe a played
 *    Permanent card as returning "to the bottom of the draw pile", but the data
 *    model represents this via the `discardPile` plus `reshuffleDiscardIntoDraw`
 *    (§7.5 calls `discardPile` the pile of played permanents). So a Permanent card
 *    goes to `discardPile` and only becomes drawable again after a reshuffle within
 *    the same combat — behaviourally equivalent to a bottom-of-pile insert.
 *  - `discard` / `exhaust` are dumb pile-movers. The policy of WHICH one a played
 *    card uses (Permanent -> discard, SingleUse -> exhaust) belongs to the
 *    CombatEngine/CardResolver, not here — so this module never reads CardType for
 *    a played card.
 */
import { CardType } from '../model';
import type { CardDefinition, CardInstance, CombatState } from '../model';
import { shuffle } from '../rng/rng';

/**
 * Deterministic seed for a mid-combat reshuffle, derived from existing state so
 * that the documented `reshuffleDiscardIntoDraw(state)` signature needs no seed.
 * The discard pile's `instanceId` order is itself state-dependent, so successive
 * reshuffles get distinct-yet-reproducible seeds.
 *
 * TODO(combat-engine): once CombatEngine.startCombat builds the CombatState it can
 * pass the run `seed` explicitly so a whole run replays identically; the optional
 * `seed` params below already support that without changing call sites.
 */
function deriveReshuffleSeed(turn: number, discardPile: readonly CardInstance[]): string {
  return `reshuffle:${turn}:${discardPile.map((c) => c.instanceId).join(',')}`;
}

/** Shuffle a list of cards deterministically by `seed`. Pure. (§5) */
export function shuffleDeck(cards: readonly CardInstance[], seed: string): CardInstance[] {
  return shuffle(cards, seed);
}

/**
 * Shuffle the `discardPile` back onto the `drawPile` and clear the discard.
 * No-op when the discard pile is empty. The reshuffled cards go beneath whatever
 * remains in the draw pile. (§10.1)
 */
export function reshuffleDiscardIntoDraw(state: CombatState, seed?: string): CombatState {
  if (state.discardPile.length === 0) return state;
  const reshuffleSeed = seed ?? deriveReshuffleSeed(state.turn, state.discardPile);
  const shuffled = shuffle(state.discardPile, reshuffleSeed);
  return {
    ...state,
    drawPile: [...state.drawPile, ...shuffled],
    discardPile: [],
  };
}

/**
 * Draw up to `n` cards from the top of the `drawPile` into the `hand`.
 * When the draw pile empties mid-draw and the discard pile is non-empty, the
 * discard is reshuffled in and drawing continues; if both piles are empty, drawing
 * stops early (the hand simply gets fewer than `n` cards). (§8.2, §10.1)
 */
export function draw(state: CombatState, n: number, seed?: string): CombatState {
  let current = state;
  const drawn: CardInstance[] = [];
  for (let i = 0; i < n; i++) {
    if (current.drawPile.length === 0) {
      if (current.discardPile.length === 0) break;
      current = reshuffleDiscardIntoDraw(current, seed);
    }
    const [top, ...rest] = current.drawPile;
    if (top === undefined) break; // unreachable after the guard; satisfies the type checker
    drawn.push(top);
    current = { ...current, drawPile: rest };
  }
  return { ...current, hand: [...current.hand, ...drawn] };
}

/**
 * Move `card` from the `hand` to the `discardPile` (where played Permanent cards
 * live until a reshuffle). No-op if the card is not in hand. (§10.1)
 */
export function discard(state: CombatState, card: CardInstance): CombatState {
  const hand = state.hand.filter((c) => c.instanceId !== card.instanceId);
  if (hand.length === state.hand.length) return state;
  return { ...state, hand, discardPile: [...state.discardPile, card] };
}

/**
 * Move `card` from the `hand` to the `exhaustPile` (where played SingleUse cards
 * go and never return this combat). No-op if the card is not in hand. (§10.1)
 */
export function exhaust(state: CombatState, card: CardInstance): CombatState {
  const hand = state.hand.filter((c) => c.instanceId !== card.instanceId);
  if (hand.length === state.hand.length) return state;
  return { ...state, hand, exhaustPile: [...state.exhaustPile, card] };
}

/**
 * Rebuild the deck for the next combat: only Permanent cards are restored;
 * SingleUse cards are dropped (they live only within a single combat). `getDef`
 * resolves a card's definition, since `CardType` lives on `CardDefinition`, not on
 * `CardInstance`. (§10.1, regression case §14.5)
 */
export function resetPermanentDeck(
  deck: readonly CardInstance[],
  getDef: (defId: string) => CardDefinition,
): CardInstance[] {
  return deck.filter((card) => getDef(card.defId).type === CardType.Permanent);
}

/** Convenience aggregate matching the class diagram (§5). */
export const DeckManager = {
  shuffle: shuffleDeck,
  draw,
  discard,
  exhaust,
  reshuffleDiscardIntoDraw,
  resetPermanentDeck,
} as const;
