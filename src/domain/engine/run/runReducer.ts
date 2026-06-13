/**
 * Run reducer — actions are data, a typed table dispatches to pure
 * `(deps, state, action) -> state` reducers (same shape as combat).
 *
 * `GenerateLevel` builds a fresh {@link LevelGraph} from the run seed (deterministic per
 * `levelIndex`). `EnterNode` walks that graph: it validates the move is along an edge from
 * the current node, marks the target visited, advances `currentNodeId`, and picks the
 * screen by node type. Combat/boss nodes additionally build a `StartCombat` from the run
 * deck (resolved against `collection`) + the node's enemies (combat seed
 * `seedFrom(`${seed}:combat:${nodeId}`)`) and store the resulting {@link CombatState}.
 * `CollectLoot` routes permanent cards into `collection`, single-use cards into the level
 * bag. `ResolveCombat` reads a finished fight back into the run: victory syncs player HP and
 * resumes navigation; defeat restarts the run.
 */
import { seedFrom } from '../../rng/rng';
import type { Seed } from '../../rng/rng';
import { CardType, CombatPhase } from '../../model';
import type {
  CardInstance,
  Collection,
  CombatState,
  EnemyDefinition,
  GenerationParams,
  LevelGraph,
  LevelNode,
  LootReward,
  PlayerState,
  RunDeck,
  RunState,
  ScreenState,
} from '../../model';
import { checkOutcome } from '../combat';

export type RunAction =
  | { readonly type: 'StartRun'; readonly seed: string; readonly player: PlayerState }
  | { readonly type: 'BuildDeck'; readonly cardInstanceIds: readonly string[] }
  | { readonly type: 'GenerateLevel' }
  | { readonly type: 'EnterNode'; readonly nodeId: string }
  | { readonly type: 'CollectLoot'; readonly reward: LootReward }
  | { readonly type: 'ResolveCombat' }
  | { readonly type: 'OnPlayerDeath' };

/** Config the run reducer needs (combat construction is pre-bound in `startCombat`). */
export interface RunDeps {
  readonly maxDeckSize: number;
  readonly generationParams: GenerationParams;
  /** Level generator with its content deps pre-bound (see `defaultLevelGenDeps`). */
  readonly generateLevel: (params: GenerationParams, seed: Seed) => LevelGraph;
  /** Build a fresh CombatState from the run deck + node enemies (combat deps pre-bound). */
  readonly startCombat: (
    player: PlayerState,
    enemies: readonly EnemyDefinition[],
    deck: readonly CardInstance[],
    seed: Seed,
  ) => CombatState;
}

const DECK_BUILDING: ScreenState = { name: 'deckBuilding' };
const EMPTY_COLLECTION: Collection = { ownedCards: [], ownedWeapons: [], ownedArmor: [] };

function reduceStartRun(
  deps: RunDeps,
  _state: RunState,
  action: Extract<RunAction, { type: 'StartRun' }>,
): RunState {
  return {
    player: action.player,
    runDeck: { cardInstanceIds: [], maxDeckSize: deps.maxDeckSize },
    collection: EMPTY_COLLECTION,
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

/** Which screen a non-combat node routes to. (Combat/boss start a fight in `reduceEnterNode`.) */
function screenForNode(node: LevelNode): ScreenState {
  switch (node.content?.kind) {
    case 'loot':
      return { name: 'loot' };
    case 'question':
      return { name: 'question' };
    default:
      return { name: `node:${node.id}` };
  }
}

/** Resolve the run deck's instance ids against the collection, dropping any unknown ids. */
function resolveDeck(runDeck: RunDeck, collection: Collection): readonly CardInstance[] {
  const byId = new Map(collection.ownedCards.map((c) => [c.instanceId, c]));
  return runDeck.cardInstanceIds
    .map((id) => byId.get(id))
    .filter((c): c is CardInstance => c !== undefined);
}

function reduceEnterNode(
  deps: RunDeps,
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

  const content = target.content;
  if (content?.kind === 'combat' || content?.kind === 'boss') {
    const enemies = content.kind === 'combat' ? content.enemies : [content.boss];
    // singleUseBag is not yet fed into the combat deck (deferred).
    const deck = resolveDeck(state.runDeck, state.collection);
    const seed = seedFrom(`${state.seed}:combat:${action.nodeId}`);
    const combat = deps.startCombat(state.player, enemies, deck, seed);
    return { ...state, currentLevel, combat, screen: { name: 'combat' } };
  }
  return { ...state, currentLevel, screen: screenForNode(target) };
}

function reduceCollectLoot(
  _deps: RunDeps,
  state: RunState,
  action: Extract<RunAction, { type: 'CollectLoot' }>,
): RunState {
  let owned = state.collection.ownedCards;
  let bag = state.singleUseBag;
  for (const def of action.reward.cards) {
    if (def.type === CardType.Permanent) {
      // Deterministic id: an append-only collection's length is a collision-free counter.
      owned = [
        ...owned,
        { instanceId: `${def.id}#${owned.length}`, defId: def.id, upgraded: false },
      ];
    } else {
      bag = [...bag, def.id];
    }
  }
  // TODO: equipment loot (reward.weapon/armor) once the loot rollers produce it.
  return { ...state, singleUseBag: bag, collection: { ...state.collection, ownedCards: owned } };
}

/** Reset the run to deck-building (death / defeat). `collection` survives via `...state`. */
function restartRun(state: RunState): RunState {
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

function reduceResolveCombat(_deps: RunDeps, state: RunState): RunState {
  const combat = state.combat;
  if (combat === null) return state;
  const outcome = checkOutcome(combat); // derive from HP; don't trust a possibly-stale phase
  if (outcome === CombatPhase.Defeat) return restartRun(state);
  if (outcome === CombatPhase.Victory) {
    return {
      ...state,
      player: { ...state.player, currentHp: Math.max(0, combat.player.hp) },
      combat: null,
      screen: { name: 'level' }, // resume navigation
    };
  }
  return state; // still ongoing → no-op
}

function reduceOnPlayerDeath(_deps: RunDeps, state: RunState): RunState {
  return restartRun(state);
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
  ResolveCombat: reduceResolveCombat,
  OnPlayerDeath: reduceOnPlayerDeath,
};

/** Apply one run action, purely (single localized dispatch cast). */
export function runReducer(deps: RunDeps, state: RunState, action: RunAction): RunState {
  const run = TABLE[action.type] as (d: RunDeps, s: RunState, a: RunAction) => RunState;
  return run(deps, state, action);
}
