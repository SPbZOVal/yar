import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import type { StoreApi } from 'zustand/vanilla';
import { createGameStore } from '../../../store';
import type { GameState } from '../../../store';
import { defaultCombatDeps, defaultPlayer, defaultRunDeps } from '../../../domain/engine/run';
import { GameStoreProvider } from '../../store/GameStoreContext';

/** A real (persistence-free) game store for screen tests. */
export function makeStore(): StoreApi<GameState> {
  return createGameStore({
    runDeps: defaultRunDeps(),
    combatDeps: defaultCombatDeps,
    newPlayer: defaultPlayer,
    initialSeed: 'test-seed',
  });
}

/** Render a screen wrapped in the store provider; returns the store. Query via RNTL `screen`. */
export async function renderWithStore(ui: ReactElement, store: StoreApi<GameState> = makeStore()) {
  await render(<GameStoreProvider store={store}>{ui}</GameStoreProvider>);
  return { store };
}

/** Press a testID and flush React 19's deferred state updates before the next read. */
export const press = async (testID: string): Promise<void> => {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
};
