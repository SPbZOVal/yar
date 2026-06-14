import { CardType, CombatPhase, NodeType } from '../../../model';
import type {
  Armor,
  CardDefinition,
  CardInstance,
  Collection,
  CombatState,
  EnemyDefinition,
  LevelGraph,
  LevelNode,
  LootReward,
  PlayerState,
  RunState,
  Weapon,
} from '../../../model';
import { GENERATION_PARAMS } from '../../../ruleset/ruleset';
import { defaultLevelGenDeps, generateLevel } from '../../level';
import { defaultRunDeps } from '..';
import { runReducer } from '../runReducer';
import type { RunAction, RunDeps } from '../runReducer';

const weapon: Weapon = { id: 'fist', name: 'Fist', attackBonus: 0, tier: 0 };
const armor: Armor = { id: 'rags', name: 'Rags', maxHpBonus: 0, blockBonus: 0, tier: 0 };

const player = (currentHp = 50): PlayerState => ({
  baseMaxHp: 50,
  currentHp,
  maxHp: 50,
  handSize: 5,
  energyPerTurn: 3,
  weapon,
  armor,
});

const inst = (instanceId: string, defId = `def-${instanceId}`): CardInstance => ({
  instanceId,
  defId,
  upgraded: false,
});

const cardDef = (id: string, type: CardType): CardDefinition => ({
  id,
  name: '',
  description: '',
  type,
  category: 'Attack',
  cost: 1,
  effects: [],
  rarity: 'Common',
  isSpecial: false,
});

const collection = (ownedCards: readonly CardInstance[] = []): Collection => ({
  ownedCards,
  ownedWeapons: [],
  ownedArmor: [],
});

// Deterministic fake: echoes the resolved deck into the draw pile, one instance per enemy.
const fakeStartCombat: RunDeps['startCombat'] = (p, enemies, deck, seed) => ({
  player: { hp: p.currentHp, baseMaxHp: p.baseMaxHp, statuses: [] },
  enemies: enemies.map((e) => ({
    entity: { hp: e.maxHp, baseMaxHp: e.maxHp, statuses: [] },
    defId: e.id,
    currentIntentIndex: 0,
  })),
  drawPile: deck,
  hand: [],
  discardPile: [],
  exhaustPile: [],
  energy: p.energyPerTurn,
  turn: 1,
  phase: CombatPhase.PlayerTurn,
  rng: seed,
});

const deps: RunDeps = {
  maxDeckSize: 3,
  generationParams: GENERATION_PARAMS,
  generateLevel: (params, seed) => generateLevel(params, defaultLevelGenDeps(), seed),
  startCombat: fakeStartCombat,
};

function runState(overrides: Partial<RunState> = {}): RunState {
  return {
    player: player(),
    runDeck: { cardInstanceIds: [], maxDeckSize: 3 },
    collection: collection(),
    currentLevel: null,
    levelIndex: 0,
    singleUseBag: [],
    combat: null,
    screen: { name: 'deckBuilding' },
    seed: 'run-seed',
    ...overrides,
  };
}

function combatState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    player: { hp: 30, baseMaxHp: 50, statuses: [] },
    enemies: [
      { entity: { hp: 10, baseMaxHp: 10, statuses: [] }, defId: 'rat', currentIntentIndex: 0 },
    ],
    drawPile: [],
    hand: [],
    discardPile: [],
    exhaustPile: [],
    energy: 3,
    turn: 1,
    phase: CombatPhase.PlayerTurn,
    rng: 0,
    ...overrides,
  };
}

// A small hand-built level for navigation tests: start → {loot, combat} → boss.
const enemy: EnemyDefinition = { id: 'rat', name: 'Rat', maxHp: 10, isBoss: false, intents: [] };
const boss: EnemyDefinition = {
  id: 'warden',
  name: 'Warden',
  maxHp: 40,
  isBoss: true,
  intents: [],
};
function level(currentNodeId = 'L0N0'): LevelGraph {
  const nodes = new Map<string, LevelNode>([
    ['L0N0', { id: 'L0N0', type: NodeType.Start, layer: 0, visited: false }],
    [
      'L1N0',
      {
        id: 'L1N0',
        type: NodeType.Loot,
        layer: 1,
        content: { kind: 'loot', reward: { cards: [], isSpecial: false } },
        visited: false,
      },
    ],
    [
      'L1N1',
      {
        id: 'L1N1',
        type: NodeType.Combat,
        layer: 1,
        content: { kind: 'combat', enemies: [enemy] },
        visited: false,
      },
    ],
    [
      'L1N2',
      {
        id: 'L1N2',
        type: NodeType.Question,
        layer: 1,
        content: {
          kind: 'question',
          question: {
            text: '?',
            options: ['a', 'b'],
            correctIndex: 0,
            rewardOnCorrect: { cards: [], isSpecial: false },
          },
        },
        visited: false,
      },
    ],
    // Content-less node (e.g. an idle waypoint) to exercise the screenForNode fallback.
    ['L1N3', { id: 'L1N3', type: NodeType.Idle, layer: 1, visited: false }],
    [
      'L2N0',
      {
        id: 'L2N0',
        type: NodeType.Boss,
        layer: 2,
        content: { kind: 'boss', boss, specialLoot: true },
        visited: false,
      },
    ],
  ]);
  const edges = [
    { from: 'L0N0', to: 'L1N0' },
    { from: 'L0N0', to: 'L1N1' },
    { from: 'L0N0', to: 'L1N2' },
    { from: 'L0N0', to: 'L1N3' },
    { from: 'L1N0', to: 'L2N0' },
    { from: 'L1N1', to: 'L2N0' },
  ];
  return { nodes, edges, startId: 'L0N0', endId: 'L2N0', layerCount: 3, currentNodeId };
}

describe('StartRun', () => {
  it('initializes a fresh, ephemeral run with an empty collection', () => {
    const action: RunAction = { type: 'StartRun', seed: 's', player: player() };
    const s = runReducer(deps, runState(), action);
    expect(s.seed).toBe('s');
    expect(s.combat).toBeNull();
    expect(s.currentLevel).toBeNull();
    expect(s.runDeck.maxDeckSize).toBe(3);
    expect(s.singleUseBag).toEqual([]);
    expect(s.collection.ownedCards).toEqual([]);
  });
});

describe('BuildDeck', () => {
  it('sets the run deck, capped at maxDeckSize', () => {
    const action: RunAction = { type: 'BuildDeck', cardInstanceIds: ['a', 'b', 'c', 'd'] };
    const s = runReducer(deps, runState(), action);
    expect(s.runDeck.cardInstanceIds).toEqual(['a', 'b', 'c']); // capped at 3
  });
});

describe('GenerateLevel', () => {
  it('builds a validated level positioned at the start node', () => {
    const s = runReducer(deps, runState({ seed: 'run-seed' }), { type: 'GenerateLevel' });
    expect(s.currentLevel).not.toBeNull();
    expect(s.currentLevel?.currentNodeId).toBe(s.currentLevel?.startId);
    expect(s.screen.name).toBe('level');
  });

  it('is deterministic per (run seed, levelIndex)', () => {
    const a = runReducer(deps, runState({ seed: 'fixed' }), { type: 'GenerateLevel' });
    const b = runReducer(deps, runState({ seed: 'fixed' }), { type: 'GenerateLevel' });
    expect(a.currentLevel).toEqual(b.currentLevel);
  });
});

describe('EnterNode', () => {
  it('is a no-op when there is no current level', () => {
    const st = runState();
    const s = runReducer(deps, st, { type: 'EnterNode', nodeId: 'L1N0' });
    expect(s).toBe(st);
  });

  it('is a no-op for a node not reachable by an edge from the current node', () => {
    const st = runState({ currentLevel: level('L0N0') });
    const s = runReducer(deps, st, { type: 'EnterNode', nodeId: 'L2N0' }); // no L0N0→L2N0 edge
    expect(s.currentLevel?.currentNodeId).toBe('L0N0');
    expect(s.screen.name).toBe('deckBuilding');
  });

  it('enters a legal non-combat node: marks visited, advances current, routes by type', () => {
    const st = runState({ currentLevel: level('L0N0') });
    const s = runReducer(deps, st, { type: 'EnterNode', nodeId: 'L1N0' });
    expect(s.currentLevel?.currentNodeId).toBe('L1N0');
    expect(s.currentLevel?.nodes.get('L1N0')?.visited).toBe(true);
    expect(s.screen.name).toBe('loot');
    expect(s.combat).toBeNull();
  });

  it('routes a question node to the question screen', () => {
    const st = runState({ currentLevel: level('L0N0') });
    const s = runReducer(deps, st, { type: 'EnterNode', nodeId: 'L1N2' });
    expect(s.screen.name).toBe('question');
    expect(s.combat).toBeNull();
  });

  it('routes a content-less node to a node-named fallback screen', () => {
    const st = runState({ currentLevel: level('L0N0') });
    const s = runReducer(deps, st, { type: 'EnterNode', nodeId: 'L1N3' });
    expect(s.screen.name).toBe('node:L1N3');
    expect(s.combat).toBeNull();
  });

  it('starts combat on a combat node: stores CombatState and resolves the run deck', () => {
    const st = runState({
      currentLevel: level('L0N0'),
      collection: collection([inst('a'), inst('b')]),
      runDeck: { cardInstanceIds: ['a', 'b', 'missing'], maxDeckSize: 3 },
    });
    const s = runReducer(deps, st, { type: 'EnterNode', nodeId: 'L1N1' });
    expect(s.screen.name).toBe('combat');
    expect(s.combat).not.toBeNull();
    expect(s.combat?.enemies).toHaveLength(1); // one enemy on the node
    expect(s.combat?.drawPile).toHaveLength(2); // unknown 'missing' id dropped
    expect(s.currentLevel?.nodes.get('L1N1')?.visited).toBe(true);
  });

  it('starts combat on a boss node using the boss as the single enemy', () => {
    const st = runState({ currentLevel: level('L1N0') });
    const s = runReducer(deps, st, { type: 'EnterNode', nodeId: 'L2N0' });
    expect(s.screen.name).toBe('combat');
    expect(s.combat?.enemies).toHaveLength(1);
    expect(s.combat?.enemies[0]?.defId).toBe('warden');
  });

  it('is deterministic per (run seed, node id)', () => {
    const st = runState({ currentLevel: level('L0N0') });
    const a = runReducer(deps, st, { type: 'EnterNode', nodeId: 'L1N1' });
    const b = runReducer(deps, st, { type: 'EnterNode', nodeId: 'L1N1' });
    expect(a.combat).toEqual(b.combat);
  });

  it('does not mutate the input level', () => {
    const original = level('L0N0');
    runReducer(deps, runState({ currentLevel: original }), { type: 'EnterNode', nodeId: 'L1N0' });
    expect(original.nodes.get('L1N0')?.visited).toBe(false);
    expect(original.currentNodeId).toBe('L0N0');
  });
});

describe('CollectLoot', () => {
  it('routes single-use cards to the level bag', () => {
    const reward: LootReward = { cards: [cardDef('ember', CardType.SingleUse)], isSpecial: false };
    const s = runReducer(deps, runState({ singleUseBag: ['old'] }), {
      type: 'CollectLoot',
      reward,
    });
    expect(s.singleUseBag).toEqual(['old', 'ember']);
    expect(s.collection.ownedCards).toEqual([]);
  });

  it('routes permanent cards to the collection as new instances', () => {
    const reward: LootReward = { cards: [cardDef('blade', CardType.Permanent)], isSpecial: false };
    const s = runReducer(deps, runState(), { type: 'CollectLoot', reward });
    expect(s.singleUseBag).toEqual([]);
    expect(s.collection.ownedCards).toEqual([
      { instanceId: 'blade#0', defId: 'blade', upgraded: false },
    ]);
  });

  it('routes a mixed batch, instance ids growing with collection size', () => {
    const reward: LootReward = {
      cards: [
        cardDef('blade', CardType.Permanent),
        cardDef('ember', CardType.SingleUse),
        cardDef('pike', CardType.Permanent),
      ],
      isSpecial: false,
    };
    const s = runReducer(deps, runState({ collection: collection([inst('x')]) }), {
      type: 'CollectLoot',
      reward,
    });
    expect(s.collection.ownedCards.map((c) => c.instanceId)).toEqual(['x', 'blade#1', 'pike#2']);
    expect(s.singleUseBag).toEqual(['ember']);
  });

  it('is deterministic and does not mutate its inputs', () => {
    const reward: LootReward = { cards: [cardDef('blade', CardType.Permanent)], isSpecial: false };
    const start = runState();
    const a = runReducer(deps, start, { type: 'CollectLoot', reward });
    const b = runReducer(deps, start, { type: 'CollectLoot', reward });
    expect(a.collection).toEqual(b.collection);
    expect(start.collection.ownedCards).toEqual([]); // input untouched
    expect(reward.cards).toHaveLength(1);
  });
});

describe('ResolveCombat', () => {
  it('is a no-op when there is no combat', () => {
    const st = runState();
    expect(runReducer(deps, st, { type: 'ResolveCombat' })).toBe(st);
  });

  it('is a no-op while combat is still ongoing', () => {
    const st = runState({ combat: combatState() }); // player & enemy both alive
    expect(runReducer(deps, st, { type: 'ResolveCombat' })).toBe(st);
  });

  it('on victory syncs player HP, clears combat, and resumes navigation', () => {
    const won = combatState({
      player: { hp: 22, baseMaxHp: 50, statuses: [] },
      enemies: [
        { entity: { hp: 0, baseMaxHp: 10, statuses: [] }, defId: 'rat', currentIntentIndex: 0 },
      ],
    });
    const st = runState({ player: player(40), combat: won, screen: { name: 'combat' } });
    const s = runReducer(deps, st, { type: 'ResolveCombat' });
    expect(s.player.currentHp).toBe(22);
    expect(s.combat).toBeNull();
    expect(s.screen.name).toBe('level');
  });

  it('on defeat restarts the run', () => {
    const lost = combatState({ player: { hp: 0, baseMaxHp: 50, statuses: [] } });
    const st = runState({ player: player(0), levelIndex: 2, singleUseBag: ['x'], combat: lost });
    const s = runReducer(deps, st, { type: 'ResolveCombat' });
    expect(s.player.currentHp).toBe(50);
    expect(s.levelIndex).toBe(0);
    expect(s.singleUseBag).toEqual([]);
    expect(s.combat).toBeNull();
    expect(s.screen.name).toBe('deckBuilding');
  });
});

describe('OnPlayerDeath', () => {
  it('restarts the run but preserves the collection', () => {
    const wounded = runState({
      player: player(3),
      levelIndex: 2,
      singleUseBag: ['x'],
      combat: combatState(),
      collection: collection([inst('keep')]),
      screen: { name: 'combat' },
    });
    const s = runReducer(deps, wounded, { type: 'OnPlayerDeath' });
    expect(s.player.currentHp).toBe(50);
    expect(s.levelIndex).toBe(0);
    expect(s.singleUseBag).toEqual([]);
    expect(s.combat).toBeNull();
    expect(s.screen.name).toBe('deckBuilding');
    expect(s.collection.ownedCards).toEqual([inst('keep')]); // survives death
  });
});

describe('defaultRunDeps', () => {
  it('starts a real combat: projects the player and builds a sized deck', () => {
    const real = defaultRunDeps();
    const st = runState({
      currentLevel: level('L0N0'),
      collection: collection([inst('a'), inst('b'), inst('c')]),
      runDeck: { cardInstanceIds: ['a', 'b', 'c'], maxDeckSize: 3 },
    });
    const s = runReducer(real, st, { type: 'EnterNode', nodeId: 'L1N1' });
    expect(s.combat).not.toBeNull();
    expect(s.combat?.enemies).toHaveLength(1);
    // All 3 deck cards conserved across hand + draw pile after the opening draw.
    expect((s.combat?.hand.length ?? 0) + (s.combat?.drawPile.length ?? 0)).toBe(3);
    expect(s.combat?.player.baseMaxHp).toBe(50); // projected from player.baseMaxHp, not maxHp
  });
});
