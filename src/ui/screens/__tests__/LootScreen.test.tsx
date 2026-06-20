import { NodeType } from '../../../domain/model';
import type { LevelGraph } from '../../../domain/model';
import { getCardDef } from '../../../domain/registry/cardRegistry';
import { LootScreen } from '../LootScreen';
import { makeStore, press, renderWithStore } from './renderWithStore';

const lootLevel = (): LevelGraph => ({
  nodes: new Map([
    [
      'L1N0',
      {
        id: 'L1N0',
        type: NodeType.Loot,
        layer: 1,
        content: { kind: 'loot', reward: { cards: [getCardDef('strike')], isSpecial: false } },
        visited: true,
      },
    ],
  ]),
  edges: [],
  startId: 'L1N0',
  endId: 'L1N0',
  layerCount: 1,
  currentNodeId: 'L1N0',
});

describe('LootScreen', () => {
  it('collects the reward into the collection and returns to the level', async () => {
    const store = makeStore();
    const before = store.getState().run.collection.ownedCards.length;
    store.setState({
      run: { ...store.getState().run, currentLevel: lootLevel(), screen: { name: 'loot' } },
    });
    await renderWithStore(<LootScreen />, store);
    await press('collect-loot');
    expect(store.getState().run.collection.ownedCards.length).toBe(before + 1);
    expect(store.getState().run.screen.name).toBe('level');
  });
});
