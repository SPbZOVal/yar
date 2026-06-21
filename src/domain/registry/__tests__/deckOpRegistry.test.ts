import { CombatPhase, DeckOp } from '../../model';
import type { CardInstance, CombatState } from '../../model';
import { DECK_OP_HANDLERS, getDeckOpHandler } from '../deckOpRegistry';

const card = (instanceId: string): CardInstance => ({
  instanceId,
  defId: `def-${instanceId}`,
  upgraded: false,
});

function state(piles: Partial<CombatState> = {}): CombatState {
  return {
    player: { hp: 50, baseMaxHp: 50, statuses: [] },
    enemies: [],
    drawPile: [],
    hand: [],
    discardPile: [],
    exhaustPile: [],
    energy: 3,
    turn: 1,
    phase: CombatPhase.PlayerTurn,
    rng: 0,
    ...piles,
  };
}

const ids = (list: readonly CardInstance[]): string[] => list.map((c) => c.instanceId);

describe('deckOpRegistry', () => {
  it('registers a handler for every DeckOp', () => {
    for (const op of Object.values(DeckOp)) {
      expect(typeof getDeckOpHandler(op)).toBe('function');
    }
  });

  it('Draw moves cards from the draw pile into the hand', () => {
    const s = getDeckOpHandler(DeckOp.Draw)(state({ drawPile: [card('a'), card('b')] }), 1);
    expect(ids(s.hand)).toEqual(['a']);
  });

  it('Reshuffle folds the discard back into the draw pile', () => {
    const s = getDeckOpHandler(DeckOp.Reshuffle)(state({ discardPile: [card('x')] }), 0);
    expect(ids(s.drawPile)).toEqual(['x']);
    expect(s.discardPile).toHaveLength(0);
  });

  it('Drop mills the top of the draw pile into the discard', () => {
    const s = getDeckOpHandler(DeckOp.Drop)(state({ drawPile: [card('a'), card('b')] }), 1);
    expect(ids(s.drawPile)).toEqual(['b']);
    expect(ids(s.discardPile)).toEqual(['a']);
  });

  it('Pick takes the top of the draw pile straight into the hand', () => {
    const s = getDeckOpHandler(DeckOp.Pick)(state({ drawPile: [card('a'), card('b')] }), 1);
    expect(ids(s.hand)).toEqual(['a']);
    expect(ids(s.drawPile)).toEqual(['b']);
  });

  it('Scry parks the top of the draw pile as a pending selection without moving it', () => {
    const s = getDeckOpHandler(DeckOp.Scry)(
      state({ drawPile: [card('a'), card('b'), card('c')] }),
      2,
    );
    expect(s.pendingSelection).toEqual({ candidateIds: ['a', 'b'], pick: 2 });
    expect(ids(s.drawPile)).toEqual(['a', 'b', 'c']); // unmoved
  });

  it('DECK_OP_HANDLERS is keyed by the exact DeckOp union', () => {
    expect(Object.keys(DECK_OP_HANDLERS).sort()).toEqual(Object.values(DeckOp).sort());
  });
});
