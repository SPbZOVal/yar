/**
 * Deck-op registry — the data-driven behavior of each `DeckManipulation` op.
 *
 * Each op maps to a pure `CombatState -> CombatState` transform reusing `DeckManager`.
 * Adding an op (drop, pick, scry, …) is adding a `DeckOp` literal + one entry; the
 * `Record<DeckOp, DeckOpHandler>` makes it a compile error until registered.
 */
import { DeckOp } from '../model';
import type { CombatState } from '../model';
import { draw, reshuffleDiscardIntoDraw } from '../deck/deckManager';

/** Applies a deck op carrying its magnitude (`value`, e.g. cards to draw). */
export type DeckOpHandler = (state: CombatState, value: number) => CombatState;

export const DECK_OP_HANDLERS: Record<DeckOp, DeckOpHandler> = {
  [DeckOp.Draw]: (state, value) => draw(state, value),
  [DeckOp.Reshuffle]: (state) => reshuffleDiscardIntoDraw(state),
};

/** Look up a deck op's handler. (Keyed by the exact union, so never undefined.) */
export const getDeckOpHandler = (op: DeckOp): DeckOpHandler => DECK_OP_HANDLERS[op];
