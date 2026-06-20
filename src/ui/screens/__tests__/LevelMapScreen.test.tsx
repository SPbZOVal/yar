import { screen } from '@testing-library/react-native';
import { NodeType } from '../../../domain/model';
import type { LevelGraph } from '../../../domain/model';
import { LevelMapScreen } from '../LevelMapScreen';
import { makeStore, press, renderWithStore } from './renderWithStore';

const level = (currentNodeId = 'L0N0'): LevelGraph => ({
  nodes: new Map([
    ['L0N0', { id: 'L0N0', type: NodeType.Start, layer: 0, visited: false }],
    [
      'L1N0',
      {
        id: 'L1N0',
        type: NodeType.Loot,
        layer: 1,
        content: { kind: 'loot', reward: { cards: [], isSpecial: false } },
        visited: false,
      },
    ],
  ]),
  edges: [{ from: 'L0N0', to: 'L1N0' }],
  startId: 'L0N0',
  endId: 'L1N0',
  layerCount: 2,
  currentNodeId,
});

const withLevel = () => {
  const store = makeStore();
  store.setState({
    run: { ...store.getState().run, currentLevel: level(), screen: { name: 'level' } },
  });
  return store;
};

describe('LevelMapScreen', () => {
  it('enters a reachable node (EnterNode advances the current node)', async () => {
    const store = withLevel();
    await renderWithStore(<LevelMapScreen />, store);
    await press('node-L1N0');
    expect(store.getState().run.currentLevel?.currentNodeId).toBe('L1N0');
  });

  it('only renders touch targets for reachable nodes', async () => {
    await renderWithStore(<LevelMapScreen />, withLevel());
    expect(screen.queryByTestId('node-L1N0')).not.toBeNull(); // reachable from start
    expect(screen.queryByTestId('node-L0N0')).toBeNull(); // current node, not a forward target
  });
});
