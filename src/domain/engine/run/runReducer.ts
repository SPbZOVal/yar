/**
 * Run reducer — SKETCH.
 *
 * The run-level flow has the same shape as combat: actions are data, a typed table
 * dispatches to pure `(deps, state, action) -> state` reducers. This is a skeleton that
 * proves the pattern at run altitude; the parts that need still-unbuilt systems
 * (LevelGenerator, LootSystem, the Collection) are documented stubs:
 *  - `EnterNode` will delegate combat/boss nodes to `combatReducer`, deriving the combat
 *    seed from the run seed (`seedFrom(`${state.seed}:combat:${nodeId}`)`).
 *  - `CollectLoot` will route permanents/equipment to the Collection (meta); for now it
 *    only fills the level's single-use bag.
 */
import type { LootReward, PlayerState, RunState, ScreenState } from '../../model';

export type RunAction =
  | { readonly type: 'StartRun'; readonly seed: string; readonly player: PlayerState }
  | { readonly type: 'BuildDeck'; readonly cardInstanceIds: readonly string[] }
  | { readonly type: 'EnterNode'; readonly nodeId: string }
  | { readonly type: 'CollectLoot'; readonly reward: LootReward }
  | { readonly type: 'OnPlayerDeath' };

/** Config the run reducer needs (extended as generation/loot/persistence land). */
export interface RunDeps {
  readonly maxDeckSize: number;
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

function reduceEnterNode(
  _deps: RunDeps,
  state: RunState,
  action: Extract<RunAction, { type: 'EnterNode' }>,
): RunState {
  // SKETCH: combat/boss nodes will delegate to combatReducer with a run-derived seed.
  return { ...state, screen: { name: `node:${action.nodeId}` } };
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
  EnterNode: reduceEnterNode,
  CollectLoot: reduceCollectLoot,
  OnPlayerDeath: reduceOnPlayerDeath,
};

/** Apply one run action, purely (single localized dispatch cast). */
export function runReducer(deps: RunDeps, state: RunState, action: RunAction): RunState {
  const run = TABLE[action.type] as (d: RunDeps, s: RunState, a: RunAction) => RunState;
  return run(deps, state, action);
}
