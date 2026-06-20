/**
 * Store selectors — derived reads over {@link GameState}. These present the docs' conceptual
 * slices (run / combat / meta / settings) without duplicating state. Empty fallbacks are shared
 * constants so combat-off selectors keep a stable reference (no needless re-renders).
 */
import type {
  CardInstance,
  CombatState,
  EnemyInstance,
  LevelEdge,
  LevelGraph,
  LevelNode,
  PlayerState,
} from '../domain/model';
import type { Collection } from '../domain/model';
import type { GameState } from './gameStore';
import type { Settings } from '../persistence';

const NO_CARDS: readonly CardInstance[] = [];
const NO_ENEMIES: readonly EnemyInstance[] = [];
const NO_NODES: readonly LevelNode[] = [];
const NO_EDGES: readonly LevelEdge[] = [];
const NO_IDS: readonly string[] = [];

/** The active run/UI screen name (drives navigation). */
export const selectScreen = (s: GameState): string => s.run.screen.name;
export const selectPlayer = (s: GameState): PlayerState => s.run.player;
/** Meta slice: the persisted, working collection. */
export const selectCollection = (s: GameState): Collection => s.run.collection;
export const selectLevel = (s: GameState): LevelGraph | null => s.run.currentLevel;
export const selectSettings = (s: GameState): Settings => s.settings;

/** All nodes / edges of the current level (for the Skia level map). */
export const selectLevelNodes = (s: GameState): readonly LevelNode[] =>
  s.run.currentLevel === null ? NO_NODES : [...s.run.currentLevel.nodes.values()];
export const selectEdges = (s: GameState): readonly LevelEdge[] =>
  s.run.currentLevel?.edges ?? NO_EDGES;

/** The node the run is currently positioned on (combat/loot/question content lives here). */
export const selectCurrentNode = (s: GameState): LevelNode | undefined => {
  const level = s.run.currentLevel;
  return level === null ? undefined : level.nodes.get(level.currentNodeId);
};

/** Node ids reachable by one forward edge from the current node (legal `EnterNode` targets). */
export const selectReachableNodeIds = (s: GameState): readonly string[] => {
  const level = s.run.currentLevel;
  if (level === null) return NO_IDS;
  return level.edges.filter((e) => e.from === level.currentNodeId).map((e) => e.to);
};

/** Combat slice: the active fight, or `null`. */
export const selectCombat = (s: GameState): CombatState | null => s.run.combat;
export const selectHand = (s: GameState): readonly CardInstance[] => s.run.combat?.hand ?? NO_CARDS;
export const selectEnemies = (s: GameState): readonly EnemyInstance[] =>
  s.run.combat?.enemies ?? NO_ENEMIES;
export const selectEnergy = (s: GameState): number => s.run.combat?.energy ?? 0;
