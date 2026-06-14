/**
 * Run reducer — actions are data, a typed table dispatches to pure
 * `(deps, state, action) -> state` reducers (same shape as combat).
 *
 * `StartRun` seeds the run's `collection` from the deps-provided starter deck. `BuildDeck`
 * selects the run deck, validating ids against the collection and capping at `maxDeckSize`.
 * `GenerateLevel` builds a fresh {@link LevelGraph} from the run seed (deterministic per
 * `levelIndex`). `EnterNode` walks that graph: it validates the move is along an edge from
 * the current node, marks the target visited, advances `currentNodeId`, and picks the
 * screen by node type. Combat/boss nodes additionally build a `StartCombat` from the run
 * deck (resolved against `collection`) plus the level's single-use bag + the node's enemies
 * (combat seed `seedFrom(`${seed}:combat:${nodeId}`)`) and store the resulting
 * {@link CombatState}. `CollectLoot` routes permanent cards into `collection`, single-use
 * cards into the level bag. `ResolveCombat` reads a finished fight back into the run:
 * victory rolls loot for the cleared node, syncs player HP, and resumes navigation; defeat
 * restarts the run.
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
  /** Card ids the fresh run's collection is seeded with (the starter deck). */
  readonly starterCards: readonly string[];
  /** Level generator with its content deps pre-bound (see `defaultLevelGenDeps`). */
  readonly generateLevel: (params: GenerationParams, seed: Seed) => LevelGraph;
  /** Build a fresh CombatState from the run deck + node enemies (combat deps pre-bound). */
  readonly startCombat: (
    player: PlayerState,
    enemies: readonly EnemyDefinition[],
    deck: readonly CardInstance[],
    seed: Seed,
  ) => CombatState;
  /** Roll a chest-style reward (cleared combat node). */
  readonly rollChestLoot: (seed: Seed) => readonly [LootReward, Seed];
  /** Roll a boss reward; `isEndBoss` unlocks special / Boss-rarity drops. */
  readonly rollBossLoot: (seed: Seed, isEndBoss: boolean) => readonly [LootReward, Seed];
}

const DECK_BUILDING: ScreenState = { name: 'deckBuilding' };
const EMPTY_COLLECTION: Collection = { ownedCards: [], ownedWeapons: [], ownedArmor: [] };

/**
 * Append one owned card to a collection with a deterministic, collision-free instance id:
 * an append-only collection's length is a monotonic counter. Shared by starter seeding and
 * loot routing so both mint ids the same way.
 */
function addOwnedCard(owned: readonly CardInstance[], defId: string): readonly CardInstance[] {
  return [...owned, { instanceId: `${defId}#${owned.length}`, defId, upgraded: false }];
}

function reduceStartRun(
  deps: RunDeps,
  _state: RunState,
  action: Extract<RunAction, { type: 'StartRun' }>,
): RunState {
  const ownedCards = deps.starterCards.reduce(addOwnedCard, EMPTY_COLLECTION.ownedCards);
  return {
    player: action.player,
    runDeck: { cardInstanceIds: [], maxDeckSize: deps.maxDeckSize },
    collection: { ...EMPTY_COLLECTION, ownedCards },
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
  // Only ids the collection actually owns may enter the deck (drop unknowns), then cap.
  const owned = new Set(state.collection.ownedCards.map((c) => c.instanceId));
  const cardInstanceIds = action.cardInstanceIds
    .filter((id) => owned.has(id))
    .slice(0, state.runDeck.maxDeckSize);
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

/** Ephemeral combat instances for the level's single-use bag (ids scoped to one fight). */
function bagInstances(singleUseBag: readonly string[]): readonly CardInstance[] {
  return singleUseBag.map((defId, i) => ({
    instanceId: `bag:${defId}#${i}`,
    defId,
    upgraded: false,
  }));
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
    // The run deck plus the level's single-use bag: bag cards are fed into every fight on
    // the level; a played single-use still exhausts within that fight (DeckManager policy).
    const deck = [
      ...resolveDeck(state.runDeck, state.collection),
      ...bagInstances(state.singleUseBag),
    ];
    const seed = seedFrom(`${state.seed}:combat:${action.nodeId}`);
    const combat = deps.startCombat(state.player, enemies, deck, seed);
    return { ...state, currentLevel, combat, screen: { name: 'combat' } };
  }
  return { ...state, currentLevel, screen: screenForNode(target) };
}

/** Route a reward's cards: permanents into the collection, single-use into the level bag. */
function routeReward(state: RunState, reward: LootReward): RunState {
  let owned = state.collection.ownedCards;
  let bag = state.singleUseBag;
  for (const def of reward.cards) {
    if (def.type === CardType.Permanent) owned = addOwnedCard(owned, def.id);
    else bag = [...bag, def.id];
  }
  // TODO: equipment loot (reward.weapon/armor) once the loot rollers produce it.
  return { ...state, singleUseBag: bag, collection: { ...state.collection, ownedCards: owned } };
}

function reduceCollectLoot(
  _deps: RunDeps,
  state: RunState,
  action: Extract<RunAction, { type: 'CollectLoot' }>,
): RunState {
  return routeReward(state, action.reward);
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

/** On a cleared combat/boss node, roll its loot deterministically and route it into the run. */
function awardCombatLoot(deps: RunDeps, state: RunState): RunState {
  const level = state.currentLevel;
  if (level === null) return state; // HP-only resolve (no active level): nothing to roll
  const content = level.nodes.get(level.currentNodeId)?.content;
  const seed = seedFrom(`${state.seed}:loot:${level.currentNodeId}`);
  if (content?.kind === 'combat') return routeReward(state, deps.rollChestLoot(seed)[0]);
  if (content?.kind === 'boss')
    return routeReward(state, deps.rollBossLoot(seed, content.specialLoot)[0]);
  return state;
}

function reduceResolveCombat(deps: RunDeps, state: RunState): RunState {
  const combat = state.combat;
  if (combat === null) return state;
  const outcome = checkOutcome(combat); // derive from HP; don't trust a possibly-stale phase
  if (outcome === CombatPhase.Defeat) return restartRun(state);
  if (outcome === CombatPhase.Victory) {
    const synced: RunState = {
      ...state,
      player: { ...state.player, currentHp: Math.max(0, combat.player.hp) },
      combat: null,
      screen: { name: 'level' }, // resume navigation
    };
    return awardCombatLoot(deps, synced);
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
