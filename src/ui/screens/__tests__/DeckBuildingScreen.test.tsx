import { DeckBuildingScreen } from '../DeckBuildingScreen';
import { makeStore, press, renderWithStore } from './renderWithStore';

describe('DeckBuildingScreen', () => {
  it('builds a deck from the selected cards and starts the level', async () => {
    const store = makeStore(); // boots with the starter collection
    const ids = store
      .getState()
      .run.collection.ownedCards.slice(0, 2)
      .map((c) => c.instanceId);

    await renderWithStore(<DeckBuildingScreen />, store);
    for (const id of ids) await press(`card-${id}`);
    await press('go');

    expect(store.getState().run.runDeck.cardInstanceIds).toEqual(ids); // BuildDeck applied
    expect(store.getState().run.screen.name).toBe('level'); // GenerateLevel routed to the map
  });
});
