import { CARD_DEFS, getCardDef } from '../cardRegistry';
import { CARDS } from '../../content/cards';

describe('cardRegistry', () => {
  it('indexes every card definition by id', () => {
    expect(CARD_DEFS.size).toBe(CARDS.length);
    for (const card of CARDS) {
      expect(getCardDef(card.id)).toBe(card);
    }
  });

  it('throws on an unknown def id', () => {
    expect(() => getCardDef('does-not-exist')).toThrow('Unknown card def');
  });
});
