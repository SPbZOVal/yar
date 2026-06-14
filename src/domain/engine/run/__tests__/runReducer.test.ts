import { CardType, CombatPhase, Lifetime, NodeType, StatusKind } from '../../../model';
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
import { STARTER_DECK } from '../../../content/starterDeck';
import { attackPower, maxHp } from '../../../entity/entity';
import { defaultLevelGenDeps, generateLevel } from '../../level';
import { defaultPlayer, defaultRunDeps } from '..';
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

// Deterministic fake loot rollers: a chest yields one permanent, a boss yields one
// permanent whose id distinguishes the end boss; both advance the seed.
const fakeChestLoot: RunDeps['rollChestLoot'] = (seed) => [
  { cards: [cardDef('chest-card', CardType.Permanent)], isSpecial: false },
  (seed + 1) | 0,
];
const fakeBossLoot: RunDeps['rollBossLoot'] = (seed, isEndBoss) => [
  {
    cards: [cardDef(isEndBoss ? 'boss-special' : 'boss-card', CardType.Permanent)],
    isSpecial: isEndBoss,
  },
  (seed + 1) | 0,
];

const deps: RunDeps = {
  maxDeckSize: 3,
  generationParams: GENERATION_PARAMS,
  starterCards: [],
  generateLevel: (params, seed) => generateLevel(params, defaultLevelGenDeps(), seed),
  startCombat: fakeStartCombat,
  rollChestLoot: fakeChestLoot,
  rollBossLoot: fakeBossLoot,
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
            rewardOnCorrect: {
              cards: [cardDef('quiz-prize', CardType.Permanent)],
              isSpecial: false,
            },
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
  it('initializes a fresh, ephemeral run (empty collection when no starter deck)', () => {
    const action: RunAction = { type: 'StartRun', seed: 's', player: player() };
    const s = runReducer(deps, runState(), action);
    expect(s.seed).toBe('s');
    expect(s.combat).toBeNull();
    expect(s.currentLevel).toBeNull();
    expect(s.runDeck.maxDeckSize).toBe(3);
    expect(s.runDeck.cardInstanceIds).toEqual([]);
    expect(s.singleUseBag).toEqual([]);
    expect(s.collection.ownedCards).toEqual([]);
  });

  it('seeds the collection from the deps starter deck with deterministic ids', () => {
    const withStarter: RunDeps = { ...deps, starterCards: ['strike', 'strike', 'defend'] };
    const s = runReducer(withStarter, runState(), {
      type: 'StartRun',
      seed: 's',
      player: player(),
    });
    expect(s.collection.ownedCards).toEqual([
      { instanceId: 'strike#0', defId: 'strike', upgraded: false },
      { instanceId: 'strike#1', defId: 'strike', upgraded: false },
      { instanceId: 'defend#2', defId: 'defend', upgraded: false },
    ]);
    expect(s.runDeck.cardInstanceIds).toEqual([]); // starter lands in the collection, not the deck
  });
});

describe('BuildDeck', () => {
  it('sets the run deck from owned ids, capped at maxDeckSize', () => {
    const st = runState({ collection: collection([inst('a'), inst('b'), inst('c'), inst('d')]) });
    const s = runReducer(deps, st, { type: 'BuildDeck', cardInstanceIds: ['a', 'b', 'c', 'd'] });
    expect(s.runDeck.cardInstanceIds).toEqual(['a', 'b', 'c']); // capped at 3
  });

  it('drops ids the collection does not own', () => {
    const st = runState({ collection: collection([inst('a'), inst('b')]) });
    const s = runReducer(deps, st, { type: 'BuildDeck', cardInstanceIds: ['a', 'missing', 'b'] });
    expect(s.runDeck.cardInstanceIds).toEqual(['a', 'b']);
  });
});

const sword: Weapon = { id: 'sword', name: 'Sword', attackBonus: 4, tier: 2 };
const plate: Armor = { id: 'plate', name: 'Plate', maxHpBonus: 10, blockBonus: 3, tier: 2 };
const owning = (overrides: Partial<Collection> = {}): Collection => ({
  ownedCards: [],
  ownedWeapons: [],
  ownedArmor: [],
  ...overrides,
});

describe('EquipWeapon / EquipArmor', () => {
  it('equips an owned weapon', () => {
    const st = runState({ collection: owning({ ownedWeapons: [sword] }) });
    const s = runReducer(deps, st, { type: 'EquipWeapon', weaponId: 'sword' });
    expect(s.player.weapon).toEqual(sword);
  });

  it('is a no-op when the weapon is not owned', () => {
    const st = runState();
    expect(runReducer(deps, st, { type: 'EquipWeapon', weaponId: 'ghost' })).toBe(st);
  });

  it('equips armor, recomputing maxHp and preserving the special (+heart) bonus', () => {
    // player with a +5 special bonus (maxHp 55, base 50, rags armor maxHpBonus 0).
    const hearted = { ...player(), maxHp: 55 };
    const st = runState({ player: hearted, collection: owning({ ownedArmor: [plate] }) });
    const s = runReducer(deps, st, { type: 'EquipArmor', armorId: 'plate' });
    expect(s.player.armor).toEqual(plate);
    expect(s.player.maxHp).toBe(65); // 50 base + 10 armor + 5 special
    expect(s.player.currentHp).toBe(50); // unchanged (≤ new max)
  });

  it('clamps currentHp when swapping to weaker armor lowers maxHp', () => {
    const wearingPlate = { ...player(), maxHp: 60, currentHp: 60, armor: plate };
    const st = runState({ player: wearingPlate, collection: owning({ ownedArmor: [armor] }) });
    const s = runReducer(deps, st, { type: 'EquipArmor', armorId: 'rags' }); // rags maxHpBonus 0
    expect(s.player.maxHp).toBe(50); // 50 + 0 + (60-50-10=0) special
    expect(s.player.currentHp).toBe(50); // clamped down from 60
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

  it('feeds the single-use bag into the combat deck alongside the run deck', () => {
    const st = runState({
      currentLevel: level('L0N0'),
      collection: collection([inst('a')]),
      runDeck: { cardInstanceIds: ['a'], maxDeckSize: 3 },
      singleUseBag: ['ember', 'frost'],
    });
    const s = runReducer(deps, st, { type: 'EnterNode', nodeId: 'L1N1' });
    // fakeStartCombat echoes the resolved deck into the draw pile: run deck + bag instances.
    expect(s.combat?.drawPile).toEqual([
      inst('a'),
      { instanceId: 'bag:ember#0', defId: 'ember', upgraded: false },
      { instanceId: 'bag:frost#1', defId: 'frost', upgraded: false },
    ]);
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

  it('routes equipment into the collection (weapons / armor)', () => {
    const reward: LootReward = { cards: [], weapon: sword, armor: plate, isSpecial: false };
    const s = runReducer(deps, runState(), { type: 'CollectLoot', reward });
    expect(s.collection.ownedWeapons).toEqual([sword]);
    expect(s.collection.ownedArmor).toEqual([plate]);
  });
});

describe('AnswerQuestion', () => {
  it('grants the reward and resumes on a correct answer', () => {
    const st = runState({ currentLevel: level('L1N2') }); // positioned on the question node
    const s = runReducer(deps, st, { type: 'AnswerQuestion', answerIndex: 0 }); // correctIndex 0
    expect(s.screen.name).toBe('level');
    expect(s.collection.ownedCards).toEqual([
      { instanceId: 'quiz-prize#0', defId: 'quiz-prize', upgraded: false },
    ]);
  });

  it('grants nothing and resumes on a wrong answer', () => {
    const st = runState({ currentLevel: level('L1N2') });
    const s = runReducer(deps, st, { type: 'AnswerQuestion', answerIndex: 1 });
    expect(s.screen.name).toBe('level');
    expect(s.collection.ownedCards).toEqual([]);
  });

  it('is a no-op off a question node and with no level', () => {
    const onStart = runState({ currentLevel: level('L0N0') });
    expect(runReducer(deps, onStart, { type: 'AnswerQuestion', answerIndex: 0 })).toBe(onStart);
    const noLevel = runState();
    expect(runReducer(deps, noLevel, { type: 'AnswerQuestion', answerIndex: 0 })).toBe(noLevel);
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

  it('on victory at a combat node rolls chest loot into the collection', () => {
    const won = combatState({
      player: { hp: 22, baseMaxHp: 50, statuses: [] },
      enemies: [
        { entity: { hp: 0, baseMaxHp: 10, statuses: [] }, defId: 'rat', currentIntentIndex: 0 },
      ],
    });
    const st = runState({ currentLevel: level('L1N1'), combat: won });
    const s = runReducer(deps, st, { type: 'ResolveCombat' });
    expect(s.player.currentHp).toBe(22);
    expect(s.combat).toBeNull();
    expect(s.screen.name).toBe('level');
    expect(s.collection.ownedCards).toEqual([
      { instanceId: 'chest-card#0', defId: 'chest-card', upgraded: false },
    ]);
  });

  it('on victory at a boss node rolls boss loot (special at the end boss)', () => {
    const won = combatState({
      player: { hp: 30, baseMaxHp: 50, statuses: [] },
      enemies: [
        { entity: { hp: 0, baseMaxHp: 40, statuses: [] }, defId: 'warden', currentIntentIndex: 0 },
      ],
    });
    const st = runState({ currentLevel: level('L2N0'), combat: won });
    const s = runReducer(deps, st, { type: 'ResolveCombat' });
    expect(s.collection.ownedCards).toEqual([
      { instanceId: 'boss-special#0', defId: 'boss-special', upgraded: false },
    ]);
    expect(s.screen.name).toBe('levelCleared'); // end boss → cutscene/advance, not the level map
  });

  it('spends the single-use bag slots played during the fight', () => {
    const won = combatState({
      player: { hp: 20, baseMaxHp: 50, statuses: [] },
      enemies: [
        { entity: { hp: 0, baseMaxHp: 10, statuses: [] }, defId: 'rat', currentIntentIndex: 0 },
      ],
      exhaustPile: [
        { instanceId: 'bag:ember#0', defId: 'ember', upgraded: false }, // bag slot 0 played
        { instanceId: 'somecard', defId: 'somecard', upgraded: false }, // non-bag, ignored
      ],
    });
    const st = runState({
      currentLevel: level('L1N1'),
      singleUseBag: ['ember', 'frost'],
      combat: won,
    });
    const s = runReducer(deps, st, { type: 'ResolveCombat' });
    expect(s.singleUseBag).toEqual(['frost']); // slot 0 consumed, slot 1 remains
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

describe('AdvanceLevel', () => {
  it('bumps the level index, drops per-level state, and returns to deck-building', () => {
    const st = runState({
      levelIndex: 0,
      currentLevel: level('L2N0'),
      singleUseBag: ['x'],
      combat: combatState(),
      collection: collection([inst('keep')]),
      screen: { name: 'levelCleared' },
    });
    const s = runReducer(deps, st, { type: 'AdvanceLevel' });
    expect(s.levelIndex).toBe(1);
    expect(s.currentLevel).toBeNull();
    expect(s.singleUseBag).toEqual([]);
    expect(s.combat).toBeNull();
    expect(s.screen.name).toBe('deckBuilding');
    expect(s.collection.ownedCards).toEqual([inst('keep')]); // collection persists across levels
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

  it('projects equipment + meta bonuses into combat as statuses', () => {
    const geared: PlayerState = {
      baseMaxHp: 50,
      currentHp: 55,
      maxHp: 60, // +10 from armor / "+heart" specials
      handSize: 5,
      energyPerTurn: 3,
      weapon: { id: 'sword', name: 'Sword', attackBonus: 3, tier: 1 },
      armor: { id: 'plate', name: 'Plate', maxHpBonus: 10, blockBonus: 0, tier: 1 },
    };
    const st = runState({
      player: geared,
      currentLevel: level('L0N0'),
      collection: collection([inst('a')]),
      runDeck: { cardInstanceIds: ['a'], maxDeckSize: 3 },
    });
    const s = runReducer(defaultRunDeps(), st, { type: 'EnterNode', nodeId: 'L1N1' });
    const combatPlayer = s.combat?.player;
    expect(combatPlayer?.baseMaxHp).toBe(50); // base, not the inflated max
    expect(combatPlayer?.statuses).toEqual(
      expect.arrayContaining([
        { kind: StatusKind.MaxHpUp, stacks: 10, lifetime: Lifetime.Run },
        { kind: StatusKind.AttackUp, stacks: 3, lifetime: Lifetime.Run },
      ]),
    );
    // Derived stats reconstitute the player's totals: maxHp == player.maxHp, attack == weapon.
    expect(combatPlayer && maxHp(combatPlayer)).toBe(60);
    expect(combatPlayer && attackPower(combatPlayer)).toBe(3);
  });

  it('drives the real loop: StartRun seeds the starter, BuildDeck selects, GenerateLevel runs', () => {
    const real = defaultRunDeps();
    const started = runReducer(real, runState(), { type: 'StartRun', seed: 'x', player: player() });
    expect(started.collection.ownedCards).toHaveLength(STARTER_DECK.length);

    const chosen = started.collection.ownedCards.slice(0, 3).map((c) => c.instanceId);
    const built = runReducer(real, started, { type: 'BuildDeck', cardInstanceIds: chosen });
    expect(built.runDeck.cardInstanceIds).toEqual(chosen);

    const leveled = runReducer(real, built, { type: 'GenerateLevel' });
    expect(leveled.currentLevel).not.toBeNull();
    expect(leveled.screen.name).toBe('level');
  });

  it('defaultPlayer builds a starting player from RuleSet + starter equipment', () => {
    const p = defaultPlayer();
    expect(p.weapon.id).toBe('fist');
    expect(p.armor.id).toBe('rags');
    expect(p.maxHp).toBe(p.baseMaxHp + p.armor.maxHpBonus);
    expect(p.currentHp).toBe(p.maxHp);
  });

  it('drives the real loop start→equip→build→generate via defaultRunDeps + defaultPlayer', () => {
    const real = defaultRunDeps();
    let s = runReducer(real, runState(), {
      type: 'StartRun',
      seed: 'e2e',
      player: defaultPlayer(),
    });
    expect(s.collection.ownedCards.length).toBe(STARTER_DECK.length);

    const chosen = s.collection.ownedCards.slice(0, 3).map((c) => c.instanceId);
    s = runReducer(real, s, { type: 'BuildDeck', cardInstanceIds: chosen });
    expect(s.runDeck.cardInstanceIds).toEqual(chosen);

    s = runReducer(real, s, { type: 'GenerateLevel' });
    expect(s.currentLevel).not.toBeNull();
    expect(s.screen.name).toBe('level');
  });
});
