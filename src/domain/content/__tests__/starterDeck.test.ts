import { getCardDef } from '../../registry/cardRegistry';
import { STARTER_DECK } from '../starterDeck';
import { BALANCE_CONSTANTS } from '../../ruleset/ruleset';

describe('STARTER_DECK', () => {
  it('references only real card definitions', () => {
    for (const id of STARTER_DECK) {
      expect(() => getCardDef(id)).not.toThrow();
    }
  });

  it('offers more than maxDeckSize cards so the first deck-build is a real choice', () => {
    expect(STARTER_DECK.length).toBeGreaterThan(BALANCE_CONSTANTS.maxDeckSize);
  });
});
