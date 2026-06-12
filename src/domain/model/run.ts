/** Run-level state. See docs/architecture/03-data-model.md §7.7. */
import type { CombatState } from './combat';
import type { LevelGraph } from './level';
import type { RunDeck } from './collection';
import type { PlayerState } from './player';

/**
 * Placeholder for navigation/screen state. Fleshed out in the navigation PR
 * (M2+); kept minimal here so RunState is complete and type-checks.
 */
export interface ScreenState {
  readonly name: string;
}

/**
 * State of a single run. Lives in the `runSlice` and is intentionally ephemeral —
 * lost on death (§6.2). `currentLevel`/`combat` are `null` when no level/combat is
 * active. Reproducible from `seed` (determinism NFR §13.1).
 */
export interface RunState {
  readonly player: PlayerState;
  readonly runDeck: RunDeck;
  readonly currentLevel: LevelGraph | null;
  readonly levelIndex: number;
  /** IDs of single-use cards present on the current level (separate lifecycle). */
  readonly singleUseBag: readonly string[];
  readonly combat: CombatState | null;
  readonly screen: ScreenState;
  readonly seed: string;
}
