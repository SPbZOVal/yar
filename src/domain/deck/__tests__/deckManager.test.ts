import { CardType, CombatPhase } from '../../model';
import type { CardDefinition, CardInstance, Entity, CombatState } from '../../model';
import {
  DeckManager,
  discard,
  draw,
  drop,
  exhaust,
  pick,
  resolveSelection,
  scry,
  reshuffleDiscardIntoDraw,
  resetPermanentDeck,
} from '../deckManager';

// --- Test helpers ------------------------------------------------------------

const PLAYER: Entity = { hp: 50, baseMaxHp: 50, statuses: [] };

function card(instanceId: string, defId = `def-${instanceId}`): CardInstance {
  return { instanceId, defId, upgraded: false };
}

function cards(...ids: string[]): CardInstance[] {
  return ids.map((id) => card(id));
}

function state(
  piles: Partial<Pick<CombatState, 'drawPile' | 'hand' | 'discardPile' | 'exhaustPile'>>,
): CombatState {
  return {
    player: PLAYER,
    enemies: [],
    drawPile: piles.drawPile ?? [],
    hand: piles.hand ?? [],
    discardPile: piles.discardPile ?? [],
    exhaustPile: piles.exhaustPile ?? [],
    energy: 3,
    turn: 1,
    phase: CombatPhase.PlayerTurn,
    rng: 0,
  };
}

const ids = (list: readonly CardInstance[]): string[] => list.map((c) => c.instanceId);

function makeDef(type: CardType): CardDefinition {
  return {
    id: 'd',
    name: 'n',
    description: '',
    type,
    category: 'Attack',
    cost: 1,
    effects: [],
    rarity: 'Common',
    targeting: 'one',
    isSpecial: false,
  };
}

// --- Tests -------------------------------------------------------------------

describe('draw', () => {
  it('moves the top N cards from draw pile to hand, preserving order', () => {
    const s = state({ drawPile: cards('a', 'b', 'c', 'd') });
    const next = draw(s, 2);
    expect(ids(next.hand)).toEqual(['a', 'b']);
    expect(ids(next.drawPile)).toEqual(['c', 'd']);
  });

  it('does not mutate the input state or its arrays', () => {
    const s = state({ drawPile: cards('a', 'b', 'c'), hand: cards('h') });
    const snapshotDraw = ids(s.drawPile);
    const snapshotHand = ids(s.hand);
    draw(s, 2);
    expect(ids(s.drawPile)).toEqual(snapshotDraw);
    expect(ids(s.hand)).toEqual(snapshotHand);
  });

  it('reshuffles the discard pile in when the draw pile empties mid-draw', () => {
    const s = state({ drawPile: cards('a'), discardPile: cards('x', 'y') });
    const next = draw(s, 3);
    // All three cards end up in hand; draw + discard piles are exhausted.
    expect(ids(next.hand).sort()).toEqual(['a', 'x', 'y']);
    expect(next.drawPile).toHaveLength(0);
    expect(next.discardPile).toHaveLength(0);
  });

  it('stops early when both draw and discard piles are empty', () => {
    const s = state({ drawPile: cards('a', 'b') });
    const next = draw(s, 5);
    expect(ids(next.hand)).toEqual(['a', 'b']);
    expect(next.drawPile).toHaveLength(0);
  });
});

describe('drop (mill)', () => {
  it('moves the top N cards from the draw pile to the discard pile, preserving order', () => {
    const s = state({ drawPile: cards('a', 'b', 'c', 'd'), discardPile: cards('x') });
    const next = drop(s, 2);
    expect(ids(next.drawPile)).toEqual(['c', 'd']);
    expect(ids(next.discardPile)).toEqual(['x', 'a', 'b']);
    expect(next.hand).toHaveLength(0);
  });

  it('never reshuffles: stops at the bottom of the draw pile', () => {
    const s = state({ drawPile: cards('a', 'b'), discardPile: cards('x') });
    const next = drop(s, 5);
    expect(ids(next.drawPile)).toEqual([]);
    expect(ids(next.discardPile)).toEqual(['x', 'a', 'b']);
  });

  it('is a no-op for a non-positive count or an empty draw pile', () => {
    const s = state({ drawPile: cards('a') });
    expect(drop(s, 0)).toBe(s);
    expect(drop(state({ discardPile: cards('x') }), 2).drawPile).toHaveLength(0);
  });
});

describe('pick (top-of-draw, no reshuffle)', () => {
  it('takes the top N cards straight into hand without touching the discard', () => {
    const s = state({ drawPile: cards('a', 'b', 'c'), hand: cards('h'), discardPile: cards('x') });
    const next = pick(s, 2);
    expect(ids(next.hand)).toEqual(['h', 'a', 'b']);
    expect(ids(next.drawPile)).toEqual(['c']);
    expect(ids(next.discardPile)).toEqual(['x']); // never reshuffled
  });

  it('stops at the bottom of the draw pile and never reshuffles', () => {
    const s = state({ drawPile: cards('a'), discardPile: cards('x', 'y') });
    const next = pick(s, 3);
    expect(ids(next.hand)).toEqual(['a']);
    expect(next.drawPile).toHaveLength(0);
    expect(ids(next.discardPile)).toEqual(['x', 'y']);
  });

  it('is a no-op for a non-positive count or an empty draw pile', () => {
    const s = state({ drawPile: cards('a') });
    expect(pick(s, 0)).toBe(s);
    expect(pick(state({ discardPile: cards('x') }), 2)).toEqual(state({ discardPile: cards('x') }));
  });
});

describe('discard / exhaust', () => {
  it('REGRESSION: a Permanent card discarded returns to the draw pile after a reshuffle in the same combat', () => {
    const permanent = card('perm');
    const afterPlay = discard(state({ hand: [permanent] }), permanent);
    expect(ids(afterPlay.discardPile)).toEqual(['perm']);
    expect(afterPlay.hand).toHaveLength(0);

    const afterReshuffle = reshuffleDiscardIntoDraw(afterPlay);
    expect(ids(afterReshuffle.drawPile)).toEqual(['perm']);
    expect(afterReshuffle.discardPile).toHaveLength(0);
  });

  it('REGRESSION: a SingleUse card exhausted never returns (reshuffle ignores the exhaust pile)', () => {
    const single = card('single');
    const afterPlay = exhaust(state({ hand: [single] }), single);
    expect(ids(afterPlay.exhaustPile)).toEqual(['single']);
    expect(afterPlay.hand).toHaveLength(0);

    const afterReshuffle = reshuffleDiscardIntoDraw(afterPlay);
    expect(afterReshuffle.drawPile).toHaveLength(0);
    expect(ids(afterReshuffle.exhaustPile)).toEqual(['single']);
  });

  it('is a no-op when the card is not in hand', () => {
    const s = state({ hand: cards('a') });
    expect(discard(s, card('ghost'))).toBe(s);
    expect(exhaust(s, card('ghost'))).toBe(s);
  });

  it('does not mutate the input state', () => {
    const c = card('a');
    const s = state({ hand: [c, card('b')] });
    const handSnapshot = ids(s.hand);
    discard(s, c);
    exhaust(s, c);
    expect(ids(s.hand)).toEqual(handSnapshot);
    expect(s.discardPile).toHaveLength(0);
    expect(s.exhaustPile).toHaveLength(0);
  });
});

describe('reshuffleDiscardIntoDraw', () => {
  it('places the reshuffled discard beneath the remaining draw pile', () => {
    const s = state({ drawPile: cards('top'), discardPile: cards('x', 'y', 'z') });
    const next = reshuffleDiscardIntoDraw(s);
    expect(next.drawPile[0]?.instanceId).toBe('top');
    expect(ids(next.drawPile).slice(1).sort()).toEqual(['x', 'y', 'z']);
    expect(next.discardPile).toHaveLength(0);
  });

  it('is a no-op when the discard pile is empty', () => {
    const s = state({ drawPile: cards('a') });
    expect(reshuffleDiscardIntoDraw(s)).toBe(s);
  });

  it('is deterministic for a given state', () => {
    const s = state({ discardPile: cards('a', 'b', 'c', 'd', 'e') });
    expect(ids(reshuffleDiscardIntoDraw(s).drawPile)).toEqual(
      ids(reshuffleDiscardIntoDraw(s).drawPile),
    );
  });
});

describe('resetPermanentDeck', () => {
  it('REGRESSION: restores all Permanent cards and drops SingleUse cards between combats', () => {
    const defs: Record<string, CardDefinition> = {
      'def-p1': makeDef(CardType.Permanent),
      'def-p2': makeDef(CardType.Permanent),
      'def-s1': makeDef(CardType.SingleUse),
    };
    const getDef = (defId: string): CardDefinition => {
      const def = defs[defId];
      if (!def) throw new Error(`unknown def ${defId}`);
      return def;
    };
    const deck: CardInstance[] = [
      { instanceId: 'p1', defId: 'def-p1', upgraded: false },
      { instanceId: 's1', defId: 'def-s1', upgraded: false },
      { instanceId: 'p2', defId: 'def-p2', upgraded: false },
    ];

    const reset = resetPermanentDeck(deck, getDef);
    expect(ids(reset)).toEqual(['p1', 'p2']);
  });
});

describe('scry', () => {
  it('parks the top N as a pending selection without moving any card', () => {
    const s = scry(state({ drawPile: cards('a', 'b', 'c', 'd') }), 3);
    expect(s.pendingSelection).toEqual({ candidateIds: ['a', 'b', 'c'], pick: 3 });
    expect(ids(s.drawPile)).toEqual(['a', 'b', 'c', 'd']); // unmoved
  });

  it('reveals only what is available when the draw pile is shorter than N', () => {
    const s = scry(state({ drawPile: cards('a', 'b') }), 5);
    expect(s.pendingSelection).toEqual({ candidateIds: ['a', 'b'], pick: 2 });
  });

  it('is a no-op for a non-positive count or an empty draw pile (same reference)', () => {
    const empty = state({ drawPile: [] });
    expect(scry(empty, 3)).toBe(empty);
    const some = state({ drawPile: cards('a') });
    expect(scry(some, 0)).toBe(some);
  });
});

describe('resolveSelection', () => {
  const pending = (): CombatState => scry(state({ drawPile: cards('a', 'b', 'c', 'd') }), 3);

  it('moves the chosen revealed cards to hand and mills the rest, clearing the selection', () => {
    const s = resolveSelection(pending(), ['a', 'c']);
    expect(s.pendingSelection).toBeUndefined();
    expect(ids(s.hand)).toEqual(['a', 'c']);
    expect(ids(s.discardPile)).toEqual(['b']); // unchosen of the revealed top
    expect(ids(s.drawPile)).toEqual(['d']); // the revealed top is consumed
  });

  it('milling all revealed cards when nothing is chosen', () => {
    const s = resolveSelection(pending(), []);
    expect(ids(s.hand)).toEqual([]);
    expect(ids(s.discardPile)).toEqual(['a', 'b', 'c']);
    expect(ids(s.drawPile)).toEqual(['d']);
  });

  it('ignores ids outside the candidates and caps the take at `pick`', () => {
    // 'd' is below the revealed window; 'ghost' is unknown — both ignored.
    const s = resolveSelection(pending(), ['a', 'd', 'ghost', 'b', 'c']);
    expect(ids(s.hand)).toEqual(['a', 'b', 'c']);
    expect(ids(s.discardPile)).toEqual([]);
  });

  it('is a no-op when nothing is pending (same reference)', () => {
    const s = state({ drawPile: cards('a') });
    expect(resolveSelection(s, ['a'])).toBe(s);
  });
});

describe('DeckManager aggregate', () => {
  it('exposes the documented API surface', () => {
    expect(typeof DeckManager.draw).toBe('function');
    expect(typeof DeckManager.discard).toBe('function');
    expect(typeof DeckManager.exhaust).toBe('function');
    expect(typeof DeckManager.drop).toBe('function');
    expect(typeof DeckManager.pick).toBe('function');
    expect(typeof DeckManager.scry).toBe('function');
    expect(typeof DeckManager.resolveSelection).toBe('function');
    expect(typeof DeckManager.reshuffleDiscardIntoDraw).toBe('function');
    expect(typeof DeckManager.resetPermanentDeck).toBe('function');
  });
});
