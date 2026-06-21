import { CutsceneScreen } from '../CutsceneScreen';
import { makeStore, press, renderWithStore } from './renderWithStore';

describe('CutsceneScreen', () => {
  it('skipping the intro cutscene advances to deck-building', async () => {
    const store = makeStore(); // a fresh run boots on the intro cutscene
    expect(store.getState().run.screen.cutscene).toBe('intro');
    await renderWithStore(<CutsceneScreen />, store);
    await press('cutscene-advance'); // "Пропустить" → DismissCutscene
    expect(store.getState().run.screen.name).toBe('deckBuilding');
  });
});
