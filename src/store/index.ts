/**
 * Store barrel — the vanilla store factory, selectors, and a default wiring over the production
 * domain deps. Pure (no React, no native): the React hook + MMKV persistence live in the app
 * layer (`src/ui`), so this module stays unit-testable in node.
 */
import { defaultCombatDeps, defaultPlayer, defaultRunDeps } from '../domain/engine/run';
import type { Persistence } from '../persistence';
import { createGameStore } from './gameStore';

export { createGameStore } from './gameStore';
export type { GameState, GameStoreDeps } from './gameStore';
export * from './selectors';

/** Production-wired store: domain default deps + an injected persistence (MMKV in the app). */
export const createDefaultGameStore = (persistence?: Persistence, seed = 'yar-run') =>
  createGameStore({
    runDeps: defaultRunDeps(),
    combatDeps: defaultCombatDeps,
    newPlayer: defaultPlayer,
    initialSeed: seed,
    persistence,
  });
