import { LevelClearedScreen } from '../LevelClearedScreen';
import { makeStore, press, renderWithStore } from './renderWithStore';

describe('LevelClearedScreen', () => {
  it('advances to the next level (bumps levelIndex, returns to deck-building)', async () => {
    const store = makeStore();
    store.setState({ run: { ...store.getState().run, screen: { name: 'levelCleared' } } });
    const before = store.getState().run.levelIndex;
    await renderWithStore(<LevelClearedScreen />, store);
    await press('advance-level');
    expect(store.getState().run.levelIndex).toBe(before + 1);
    expect(store.getState().run.screen.name).toBe('deckBuilding');
  });
});
