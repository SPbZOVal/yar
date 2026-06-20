/**
 * App-side store wiring. The vanilla game store is a module singleton wired to MMKV persistence
 * (this is the ONLY place the native MMKV store is imported, keeping it out of the core + tests).
 * Components subscribe via the `useGameStore` hook.
 */
import { useStore } from 'zustand';
import { createDefaultGameStore } from '../../store';
import type { GameState } from '../../store';
import { createPersistence } from '../../persistence';
import { MmkvKeyValueStore } from '../../persistence/mmkvStore';

/** The singleton store: hydrates persisted meta/settings at import. */
export const gameStore = createDefaultGameStore(createPersistence(new MmkvKeyValueStore()), 'boot');

/** Subscribe a component to a slice of game state. */
export function useGameStore<T>(selector: (state: GameState) => T): T {
  return useStore(gameStore, selector);
}
