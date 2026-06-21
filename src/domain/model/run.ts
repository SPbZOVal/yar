/** Run-level state. See docs/architecture/03-data-model.md §7.7. */
import type { CombatState } from './combat';
import type { Cutscene } from './enums';
import type { LevelGraph } from './level';
import type { Collection, RunDeck } from './collection';
import type { PlayerState } from './player';

/**
 * Which sub-screen the run shows. `name` drives the UI router (`GameScreen`); when
 * `name === 'cutscene'`, `cutscene` says which narrative beat to play and what
 * `DismissCutscene` advances to.
 */
export interface ScreenState {
  readonly name: string;
  readonly cutscene?: Cutscene;
}

/**
 * State of a single run. Lives in the `runSlice` and is intentionally ephemeral —
 * lost on death (§6.2). `currentLevel`/`combat` are `null` when no level/combat is
 * active. Reproducible from `seed` (determinism NFR §13.1).
 */
export interface RunState {
  readonly player: PlayerState;
  readonly runDeck: RunDeck;
  /** The run's working CardInstance store: resolves runDeck ids; receives collected permanents. */
  readonly collection: Collection;
  readonly currentLevel: LevelGraph | null;
  readonly levelIndex: number;
  /** IDs of single-use cards present on the current level (separate lifecycle). */
  readonly singleUseBag: readonly string[];
  readonly combat: CombatState | null;
  readonly screen: ScreenState;
  readonly seed: string;
}
