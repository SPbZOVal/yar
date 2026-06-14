import { CombatPhase } from '../../domain/model';
import type { CombatState } from '../../domain/model';
import { STARTER_DECK } from '../../domain/content/starterDeck';
import { InMemoryKeyValueStore, createPersistence } from '../../persistence';
import { createDefaultGameStore } from '..';

const mkStore = () => {
  const kv = new InMemoryKeyValueStore();
  return { kv, store: createDefaultGameStore(createPersistence(kv), 'test-seed') };
};

describe('createGameStore', () => {
  it('boots into deck-building with the starter collection', () => {
    const s = mkStore().store.getState();
    expect(s.run.screen.name).toBe('deckBuilding');
    expect(s.run.collection.ownedCards.length).toBe(STARTER_DECK.length);
  });

  it('dispatch routes run actions through the reducer (BuildDeck)', () => {
    const { store } = mkStore();
    const ids = store
      .getState()
      .run.collection.ownedCards.slice(0, 3)
      .map((c) => c.instanceId);
    store.getState().dispatch({ type: 'BuildDeck', cardInstanceIds: ids });
    expect(store.getState().run.runDeck.cardInstanceIds).toEqual(ids);
  });

  it('newRun keeps the persisted collection (returning player)', () => {
    const { kv } = mkStore(); // boot saved the starter collection
    const p = createPersistence(kv);
    const saved = p.load();
    if (saved === null) throw new Error('expected a boot save');
    p.save({
      ...saved,
      collection: {
        ...saved.collection,
        ownedCards: [
          ...saved.collection.ownedCards,
          { instanceId: 'extra#99', defId: 'strike', upgraded: false },
        ],
      },
    });
    const store2 = createDefaultGameStore(p, 'another-seed');
    store2.getState().newRun('fresh');
    expect(
      store2.getState().run.collection.ownedCards.some((c) => c.instanceId === 'extra#99'),
    ).toBe(true);
  });

  it('dispatchCombat is a no-op with no active combat', () => {
    const { store } = mkStore();
    const before = store.getState().run;
    store.getState().dispatchCombat({ type: 'EndTurn' });
    expect(store.getState().run).toBe(before);
  });

  it('dispatchCombat routes in-combat actions through combatReducer', () => {
    const { store } = mkStore();
    const combat: CombatState = {
      player: { hp: 30, baseMaxHp: 50, statuses: [] },
      enemies: [
        { entity: { hp: 8, baseMaxHp: 8, statuses: [] }, defId: 'bat', currentIntentIndex: 0 },
      ],
      drawPile: [],
      hand: [],
      discardPile: [],
      exhaustPile: [],
      energy: 3,
      turn: 1,
      phase: CombatPhase.PlayerTurn,
      rng: 0,
    };
    store.setState({ run: { ...store.getState().run, combat } });
    store.getState().dispatchCombat({ type: 'EndTurn' });
    expect(store.getState().run.combat?.turn).toBe(2); // combatReducer advanced the turn
  });

  it('persists settings; a second store over the same storage hydrates them', () => {
    const { kv, store } = mkStore();
    store.getState().updateSettings({ soundEnabled: false, language: 'en' });
    const store2 = createDefaultGameStore(createPersistence(kv), 'x');
    expect(store2.getState().settings).toEqual({
      soundEnabled: false,
      language: 'en',
      difficulty: 'normal',
    });
  });
});
