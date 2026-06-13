import { NodeType } from '../../../model';
import type {
  Armor,
  EnemyDefinition,
  LevelGraph,
  LevelNode,
  LootReward,
  PlayerState,
  Weapon,
} from '../../../model';
import type { RunState } from '../../../model';
import { GENERATION_PARAMS } from '../../../ruleset/ruleset';
import { defaultLevelGenDeps, generateLevel } from '../../level';
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

const deps: RunDeps = {
  maxDeckSize: 3,
  generationParams: GENERATION_PARAMS,
  generateLevel: (params, seed) => generateLevel(params, defaultLevelGenDeps(), seed),
};

function runState(overrides: Partial<RunState> = {}): RunState {
  return {
    player: player(),
    runDeck: { cardInstanceIds: [], maxDeckSize: 3 },
    currentLevel: null,
    levelIndex: 0,
    singleUseBag: [],
    combat: null,
    screen: { name: 'deckBuilding' },
    seed: 'run-seed',
    ...overrides,
  };
}

// A small hand-built level for navigation tests: start → {loot, combat} → boss.
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
        content: { kind: 'combat', enemies: [] },
        visited: false,
      },
    ],
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
    { from: 'L1N0', to: 'L2N0' },
    { from: 'L1N1', to: 'L2N0' },
  ];
  return { nodes, edges, startId: 'L0N0', endId: 'L2N0', layerCount: 3, currentNodeId };
}

describe('StartRun', () => {
  it('initializes a fresh, ephemeral run', () => {
    const action: RunAction = { type: 'StartRun', seed: 's', player: player() };
    const s = runReducer(deps, runState(), action);
    expect(s.seed).toBe('s');
    expect(s.combat).toBeNull();
    expect(s.currentLevel).toBeNull();
    expect(s.runDeck.maxDeckSize).toBe(3);
    expect(s.singleUseBag).toEqual([]);
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

  it('enters a legal node: marks it visited, advances current, routes by type', () => {
    const st = runState({ currentLevel: level('L0N0') });
    const s = runReducer(deps, st, { type: 'EnterNode', nodeId: 'L1N0' });
    expect(s.currentLevel?.currentNodeId).toBe('L1N0');
    expect(s.currentLevel?.nodes.get('L1N0')?.visited).toBe(true);
    expect(s.screen.name).toBe('loot');
  });

  it('routes combat and boss nodes to the combat screen without starting combat (deferred)', () => {
    const combatNode = runReducer(deps, runState({ currentLevel: level('L0N0') }), {
      type: 'EnterNode',
      nodeId: 'L1N1',
    });
    expect(combatNode.screen.name).toBe('combat');
    expect(combatNode.combat).toBeNull();

    const bossNode = runReducer(deps, runState({ currentLevel: level('L1N0') }), {
      type: 'EnterNode',
      nodeId: 'L2N0',
    });
    expect(bossNode.screen.name).toBe('combat');
    expect(bossNode.combat).toBeNull();
  });

  it('does not mutate the input level', () => {
    const original = level('L0N0');
    runReducer(deps, runState({ currentLevel: original }), { type: 'EnterNode', nodeId: 'L1N0' });
    expect(original.nodes.get('L1N0')?.visited).toBe(false);
    expect(original.currentNodeId).toBe('L0N0');
  });
});

describe('CollectLoot', () => {
  it('adds reward card ids to the single-use bag', () => {
    const reward: LootReward = {
      cards: [
        {
          id: 'ember',
          name: '',
          description: '',
          type: 'SingleUse',
          category: 'Attack',
          cost: 1,
          effects: [],
          rarity: 'Common',
          isSpecial: false,
        },
      ],
      isSpecial: false,
    };
    const s = runReducer(deps, runState({ singleUseBag: ['old'] }), {
      type: 'CollectLoot',
      reward,
    });
    expect(s.singleUseBag).toEqual(['old', 'ember']);
  });
});

describe('OnPlayerDeath', () => {
  it('restarts the run: full HP, fresh level/combat/bag', () => {
    const wounded = runState({
      player: player(3),
      levelIndex: 2,
      singleUseBag: ['x'],
      screen: { name: 'combat' },
    });
    const s = runReducer(deps, wounded, { type: 'OnPlayerDeath' });
    expect(s.player.currentHp).toBe(50);
    expect(s.levelIndex).toBe(0);
    expect(s.singleUseBag).toEqual([]);
    expect(s.combat).toBeNull();
    expect(s.screen.name).toBe('deckBuilding');
  });
});
