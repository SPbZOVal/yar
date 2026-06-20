/**
 * Game-store React context. The store instance is provided at the app root so screens stay
 * store-agnostic: production wraps an MMKV-backed store (App.tsx), tests wrap an in-memory one.
 * No native imports here — keeps the screens + their tests free of MMKV.
 */
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand/vanilla';
import type { GameState } from '../../store';

const GameStoreContext = createContext<StoreApi<GameState> | null>(null);

export function GameStoreProvider({
  store,
  children,
}: {
  store: StoreApi<GameState>;
  children: ReactNode;
}) {
  return <GameStoreContext.Provider value={store}>{children}</GameStoreContext.Provider>;
}

/** Subscribe a component to a slice of game state. Must be used under a {@link GameStoreProvider}. */
export function useGameStore<T>(selector: (state: GameState) => T): T {
  const store = useContext(GameStoreContext);
  if (store === null) throw new Error('useGameStore must be used within a GameStoreProvider');
  return useStore(store, selector);
}
