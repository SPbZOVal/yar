/**
 * Run reducer — actions are data, a typed table dispatches to pure
 * `(deps, state, action) -> state` reducers (same shape as combat).
 *
 * `GenerateLevel` builds a fresh {@link LevelGraph} from the run seed (deterministic per
 * `levelIndex`). `EnterNode` walks that graph: it validates the move is along an edge from
 * the current node, marks the target visited, advances `currentNodeId`, and picks the
 * screen by node type. Two integrations are still deferred to a follow-up PR (they need a
 * `RunState.collection` model change):
 *  - combat/boss nodes will build a `StartCombat` action from the run deck + node enemies
 *    (combat seed `seedFrom(`${state.seed}:combat:${nodeId}`)`) and store the `CombatState`;
 *    for now they only navigate to the combat screen.
 *  - `CollectLoot` will route permanents/equipment to the Collection; for now it only fills
 *    the level's single-use bag.
 */
import { seedFrom } from '../../rng/rng';
import type { Seed } from '../../rng/rng';
import type {
  GenerationParams,
  LevelGraph,
  LevelNode,
  LootReward,
  PlayerState,
  RunState,
  ScreenState,
} from '../../model';

export type RunAction =
  | { readonly type: 'StartRun'; readonly seed: string; readonly player: PlayerState }
  | { readonly type: 'BuildDeck'; readonly cardInstanceIds: readonly string[] }
  | { readonly type: 'GenerateLevel' }
  | { readonly type: 'EnterNode'; readonly nodeId: string }
  | { readonly type: 'CollectLoot'; readonly reward: LootReward }
  | { readonly type: 'OnPlayerDeath' };

/** Config the run reducer needs (extended as combat delegation/persistence land). */
export interface RunDeps {
  readonly maxDeckSize: number;
  readonly generationParams: GenerationParams;
  /** Level generator with its content deps pre-bound (see `defaultLevelGenDeps`). */
  readonly generateLevel: (params: GenerationParams, seed: Seed) => LevelGraph;
}

const DECK_BUILDING: ScreenState = { name: 'deckBuilding' };

function reduceStartRun(
  deps: RunDeps,
  _state: RunState,
  action: Extract<RunAction, { type: 'StartRun' }>,
): RunState {
  return {
    player: action.player,
    runDeck: { cardInstanceIds: [], maxDeckSize: deps.maxDeckSize },
    currentLevel: null,
    levelIndex: 0,
    singleUseBag: [],
    combat: null,
    screen: DECK_BUILDING,
    seed: action.seed,
  };
}

function reduceBuildDeck(
  _deps: RunDeps,
  state: RunState,
  action: Extract<RunAction, { type: 'BuildDeck' }>,
): RunState {
  const cardInstanceIds = action.cardInstanceIds.slice(0, state.runDeck.maxDeckSize);
  return { ...state, runDeck: { ...state.runDeck, cardInstanceIds } };
}

function reduceGenerateLevel(deps: RunDeps, state: RunState): RunState {
  const levelSeed = seedFrom(`${state.seed}:level:${state.levelIndex}`);
  const level = deps.generateLevel(deps.generationParams, levelSeed);
  return { ...state, currentLevel: level, screen: { name: 'level' } };
}

/** Which screen a node routes to. Combat/boss navigate only here; combat starts in PR2. */
function screenForNode(node: LevelNode): ScreenState {
  switch (node.content?.kind) {
    case 'combat':
    case 'boss':
      return { name: 'combat' };
    case 'loot':
      return { name: 'loot' };
    case 'question':
      return { name: 'question' };
    default:
      return { name: `node:${node.id}` };
  }
}

function reduceEnterNode(
  _deps: RunDeps,
  state: RunState,
  action: Extract<RunAction, { type: 'EnterNode' }>,
): RunState {
  const level = state.currentLevel;
  if (level === null) return state;
  // Only a node adjacent to the current one (along a forward edge) may be entered.
  const legal = level.edges.some((e) => e.from === level.currentNodeId && e.to === action.nodeId);
  if (!legal) return state;
  const target = level.nodes.get(action.nodeId);
  if (target === undefined) return state;

  const nodes = new Map(level.nodes);
  nodes.set(action.nodeId, { ...target, visited: true });
  const currentLevel: LevelGraph = { ...level, nodes, currentNodeId: action.nodeId };
  // PR2: combat/boss nodes will also build a StartCombat and set `combat` here.
  return { ...state, currentLevel, screen: screenForNode(target) };
}

function reduceCollectLoot(
  _deps: RunDeps,
  state: RunState,
  action: Extract<RunAction, { type: 'CollectLoot' }>,
): RunState {
  // SKETCH: single-use cards go to the level bag; permanents/equipment → Collection later.
  const ids = action.reward.cards.map((c) => c.id);
  return { ...state, singleUseBag: [...state.singleUseBag, ...ids] };
}

function reduceOnPlayerDeath(_deps: RunDeps, state: RunState): RunState {
  // Death restarts the run: full HP, fresh level/combat/bag. Meta survives elsewhere.
  return {
    ...state,
    player: { ...state.player, currentHp: state.player.maxHp },
    currentLevel: null,
    levelIndex: 0,
    singleUseBag: [],
    combat: null,
    screen: DECK_BUILDING,
  };
}

type RunReducerTable = {
  readonly [T in RunAction['type']]: (
    deps: RunDeps,
    state: RunState,
    action: Extract<RunAction, { type: T }>,
  ) => RunState;
};

const TABLE: RunReducerTable = {
  StartRun: reduceStartRun,
  BuildDeck: reduceBuildDeck,
  GenerateLevel: reduceGenerateLevel,
  EnterNode: reduceEnterNode,
  CollectLoot: reduceCollectLoot,
  OnPlayerDeath: reduceOnPlayerDeath,
};

/** Apply one run action, purely (single localized dispatch cast). */
export function runReducer(deps: RunDeps, state: RunState, action: RunAction): RunState {
  const run = TABLE[action.type] as (d: RunDeps, s: RunState, a: RunAction) => RunState;
  return run(deps, state, action);
}
