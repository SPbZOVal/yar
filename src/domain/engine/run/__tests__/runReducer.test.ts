import type { Armor, LootReward, PlayerState, RunState, Weapon } from '../../../model';
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

const deps: RunDeps = { maxDeckSize: 3 };

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

describe('EnterNode', () => {
  it('records the active node on the screen (sketch)', () => {
    const s = runReducer(deps, runState(), { type: 'EnterNode', nodeId: 'n1' });
    expect(s.screen.name).toBe('node:n1');
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
