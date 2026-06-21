import type { ComponentProps } from 'react';
import { MainMenuScreen } from '../MainMenuScreen';
import { makeStore, press, renderWithStore } from './renderWithStore';

/** Minimal navigation stub; the screen only calls `navigate`. */
const propsWith = (navigate: jest.Mock): ComponentProps<typeof MainMenuScreen> =>
  ({ navigation: { navigate }, route: { key: 'k', name: 'MainMenu' } }) as never;

describe('MainMenuScreen', () => {
  it('starts a new run and navigates to the game', async () => {
    const store = makeStore();
    const navigate = jest.fn();
    await renderWithStore(<MainMenuScreen {...propsWith(navigate)} />, store);
    await press('new-run');
    expect(navigate).toHaveBeenCalledWith('Game');
    expect(store.getState().run.screen.name).toBe('cutscene'); // fresh run opens on the intro
  });

  it('continues to the game without starting a new run', async () => {
    const store = makeStore();
    const navigate = jest.fn();
    await renderWithStore(<MainMenuScreen {...propsWith(navigate)} />, store);
    await press('continue');
    expect(navigate).toHaveBeenCalledWith('Game');
  });
});
