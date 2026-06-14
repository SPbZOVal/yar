/**
 * Store selectors — derived reads over {@link GameState}. These present the docs' conceptual
 * slices (run / combat / meta / settings) without duplicating state. Empty fallbacks are shared
 * constants so combat-off selectors keep a stable reference (no needless re-renders).
 */
import type {
  CardInstance,
  CombatState,
  EnemyInstance,
  LevelGraph,
  PlayerState,
} from '../domain/model';
import type { Collection } from '../domain/model';
import type { GameState } from './gameStore';
import type { Settings } from '../persistence';

const NO_CARDS: readonly CardInstance[] = [];
const NO_ENEMIES: readonly EnemyInstance[] = [];

/** The active run/UI screen name (drives navigation). */
export const selectScreen = (s: GameState): string => s.run.screen.name;
export const selectPlayer = (s: GameState): PlayerState => s.run.player;
/** Meta slice: the persisted, working collection. */
export const selectCollection = (s: GameState): Collection => s.run.collection;
export const selectLevel = (s: GameState): LevelGraph | null => s.run.currentLevel;
export const selectSettings = (s: GameState): Settings => s.settings;

/** Combat slice: the active fight, or `null`. */
export const selectCombat = (s: GameState): CombatState | null => s.run.combat;
export const selectHand = (s: GameState): readonly CardInstance[] => s.run.combat?.hand ?? NO_CARDS;
export const selectEnemies = (s: GameState): readonly EnemyInstance[] =>
  s.run.combat?.enemies ?? NO_ENEMIES;
export const selectEnergy = (s: GameState): number => s.run.combat?.energy ?? 0;
