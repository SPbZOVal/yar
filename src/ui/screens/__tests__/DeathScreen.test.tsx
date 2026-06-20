import { DeathScreen } from '../DeathScreen';
import { makeStore, press, renderWithStore } from './renderWithStore';

describe('DeathScreen', () => {
  it('restarts the run (full HP, back to deck-building, collection preserved)', async () => {
    const store = makeStore();
    const run = store.getState().run;
    store.setState({
      run: {
        ...run,
        player: { ...run.player, currentHp: 0 },
        levelIndex: 2,
        screen: { name: 'death' },
      },
    });
    await renderWithStore(<DeathScreen />, store);
    await press('restart-run');
    const after = store.getState().run;
    expect(after.screen.name).toBe('deckBuilding');
    expect(after.player.currentHp).toBe(after.player.maxHp);
    expect(after.levelIndex).toBe(0);
  });
});
