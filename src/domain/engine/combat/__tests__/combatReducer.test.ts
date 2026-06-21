import {
  CardCategory,
  CardType,
  CombatPhase,
  Lifetime,
  Rarity,
  StatusKind,
  Targeting,
  TargetType,
} from '../../../model';
import type {
  CardDefinition,
  CardInstance,
  CombatState,
  Effect,
  EnemyDefinition,
  Entity,
} from '../../../model';
import { seedFrom } from '../../../rng/rng';
import { block } from '../../../entity/entity';
import { combatReducer } from '../combatReducer';
import type { CombatDeps } from '../combatReducer';
import type { CombatAction } from '../actions';

// --- Content fixtures --------------------------------------------------------

const damage = (value: number): Effect => ({
  kind: 'ApplyStatus',
  value,
  target: TargetType.Targets,
  status: StatusKind.Damage,
  lifetime: Lifetime.Instant,
});

function card(
  id: string,
  type: CardType,
  cost: number,
  effects: Effect[],
  targeting: Targeting = Targeting.One,
): CardDefinition {
  return {
    id,
    name: id,
    description: '',
    type,
    category: CardCategory.Attack,
    cost,
    effects,
    rarity: Rarity.Common,
    targeting,
    isSpecial: false,
  };
}

const STRIKE = card('strike', CardType.Permanent, 1, [damage(6)]);
const BOMB = card('bomb', CardType.SingleUse, 1, [damage(8)]);
// An AoE (cleave) card: one Targets effect, but `targeting: All` makes the engine fan it out.
const CLEAVE = card('cleave', CardType.Permanent, 1, [damage(4)], Targeting.All);
const BASHER: EnemyDefinition = {
  id: 'basher',
  name: 'Basher',
  maxHp: 20,
  isBoss: false,
  intents: [
    { kind: 'attack', value: 6 },
    { kind: 'block', value: 3 },
  ],
};

const CARDS: Record<string, CardDefinition> = { strike: STRIKE, bomb: BOMB, cleave: CLEAVE };
const ENEMIES: Record<string, EnemyDefinition> = { basher: BASHER };

const deps: CombatDeps = {
  getDef: (id) => {
    const d = CARDS[id];
    if (d === undefined) throw new Error(`card ${id}`);
    return d;
  },
  getEnemyDef: (id) => {
    const d = ENEMIES[id];
    if (d === undefined) throw new Error(`enemy ${id}`);
    return d;
  },
  handSize: 3,
  energyPerTurn: 3,
};

// --- Test helpers ------------------------------------------------------------

const player = (hp = 50, statuses: Entity['statuses'] = []): Entity => ({
  hp,
  baseMaxHp: 50,
  statuses,
});
const inst = (instanceId: string, defId: string): CardInstance => ({
  instanceId,
  defId,
  upgraded: false,
});

function emptyState(): CombatState {
  return {
    player: player(),
    enemies: [],
    drawPile: [],
    hand: [],
    discardPile: [],
    exhaustPile: [],
    energy: 0,
    turn: 0,
    phase: CombatPhase.PlayerTurn,
    rng: 0,
  };
}

function playable(overrides: Partial<CombatState> = {}): CombatState {
  return {
    player: player(),
    enemies: [
      { entity: { hp: 20, baseMaxHp: 20, statuses: [] }, defId: 'basher', currentIntentIndex: 0 },
    ],
    drawPile: [inst('d1', 'strike'), inst('d2', 'strike')],
    hand: [inst('h1', 'strike'), inst('hb', 'bomb')],
    discardPile: [],
    exhaustPile: [],
    energy: 3,
    turn: 1,
    phase: CombatPhase.PlayerTurn,
    rng: 0,
    ...overrides,
  };
}

const PLAY_H1: CombatAction = {
  type: 'PlayCard',
  instanceId: 'h1',
  source: { side: 'player' },
  targets: [{ side: 'enemy', index: 0 }],
};
const END_TURN: CombatAction = { type: 'EndTurn' };

// --- StartCombat -------------------------------------------------------------

describe('StartCombat', () => {
  const start: CombatAction = {
    type: 'StartCombat',
    player: player(),
    enemies: [BASHER],
    deck: [inst('c1', 'strike'), inst('c2', 'strike'), inst('c3', 'strike'), inst('c4', 'bomb')],
    seed: seedFrom('start'),
  };

  it('shuffles the deck, draws the opening hand, and starts on the player turn', () => {
    const s = combatReducer(deps, emptyState(), start);
    expect(s.hand).toHaveLength(3); // handSize
    expect(s.drawPile).toHaveLength(1); // 4 - 3
    expect(s.phase).toBe(CombatPhase.PlayerTurn);
    expect(s.energy).toBe(3);
    expect(s.turn).toBe(1);
    expect(s.enemies[0]?.entity.hp).toBe(20);
  });

  it('is deterministic by seed (same seed ⇒ same hand; different seed ⇒ reordered)', () => {
    const deck = Array.from({ length: 8 }, (_, i) => inst(`k${i}`, 'strike'));
    const run = (seed: string): CombatState =>
      combatReducer(deps, emptyState(), { ...start, deck, seed: seedFrom(seed) });
    expect(run('x')).toEqual(run('x'));
    expect(run('x').hand.map((c) => c.instanceId)).not.toEqual(
      run('y').hand.map((c) => c.instanceId),
    );
  });
});

// --- PlayCard ----------------------------------------------------------------

describe('PlayCard', () => {
  it('pays energy, deals damage to the target, and discards a Permanent', () => {
    const s = combatReducer(deps, playable(), PLAY_H1);
    expect(s.energy).toBe(2); // 3 - 1
    expect(s.enemies[0]?.entity.hp).toBe(14); // 20 - 6
    expect(s.hand.map((c) => c.instanceId)).toEqual(['hb']);
    expect(s.discardPile.map((c) => c.instanceId)).toEqual(['h1']);
  });

  it('exhausts a SingleUse card', () => {
    const action: CombatAction = { ...PLAY_H1, instanceId: 'hb' };
    const s = combatReducer(deps, playable(), action);
    expect(s.exhaustPile.map((c) => c.instanceId)).toEqual(['hb']);
    expect(s.enemies[0]?.entity.hp).toBe(12); // 20 - 8
  });

  it('wins when the last enemy dies', () => {
    const s = combatReducer(
      deps,
      playable({
        enemies: [
          {
            entity: { hp: 4, baseMaxHp: 20, statuses: [] },
            defId: 'basher',
            currentIntentIndex: 0,
          },
        ],
      }),
      PLAY_H1,
    );
    expect(s.phase).toBe(CombatPhase.Victory);
  });

  it('is a no-op off the player turn, not in hand, or unaffordable (same reference)', () => {
    const off = playable({ phase: CombatPhase.EnemyTurn });
    expect(combatReducer(deps, off, PLAY_H1)).toBe(off);

    const st = playable();
    expect(combatReducer(deps, st, { ...PLAY_H1, instanceId: 'ghost' })).toBe(st);

    const broke = playable({ energy: 0 });
    expect(combatReducer(deps, broke, PLAY_H1)).toBe(broke);
  });
});

// --- PlayCard targeting (One vs All) -----------------------------------------

describe('PlayCard targeting', () => {
  const twoEnemies = [
    { entity: { hp: 20, baseMaxHp: 20, statuses: [] }, defId: 'basher', currentIntentIndex: 0 },
    { entity: { hp: 18, baseMaxHp: 20, statuses: [] }, defId: 'basher', currentIntentIndex: 0 },
  ];
  const playCleave: CombatAction = {
    type: 'PlayCard',
    instanceId: 'hc',
    source: { side: 'player' },
    targets: [], // the UI passes no target for an AoE card; the engine fans it out
  };

  it('an All card cleaves every living enemy in one play, paying the cost once', () => {
    const s = combatReducer(
      deps,
      playable({ enemies: twoEnemies, hand: [inst('hc', 'cleave')], energy: 3 }),
      playCleave,
    );
    expect(s.enemies.map((e) => e.entity.hp)).toEqual([16, 14]); // both took 4
    expect(s.energy).toBe(2); // cost 1 paid once, not per enemy
    expect(s.discardPile.map((c) => c.instanceId)).toEqual(['hc']);
  });

  it('an All card skips a dead enemy (hp 0)', () => {
    const s = combatReducer(
      deps,
      playable({
        enemies: [
          {
            entity: { hp: 0, baseMaxHp: 20, statuses: [] },
            defId: 'basher',
            currentIntentIndex: 0,
          },
          {
            entity: { hp: 20, baseMaxHp: 20, statuses: [] },
            defId: 'basher',
            currentIntentIndex: 0,
          },
        ],
        hand: [inst('hc', 'cleave')],
      }),
      playCleave,
    );
    expect(s.enemies.map((e) => e.entity.hp)).toEqual([0, 16]); // dead untouched, living took 4
  });

  it('ignores a stale single target on an All card and still hits all enemies', () => {
    const s = combatReducer(deps, playable({ enemies: twoEnemies, hand: [inst('hc', 'cleave')] }), {
      ...playCleave,
      targets: [{ side: 'enemy', index: 0 }],
    });
    expect(s.enemies.map((e) => e.entity.hp)).toEqual([16, 14]); // both, not just index 0
  });

  it('a One card hits only the chosen target, leaving other enemies unharmed', () => {
    const s = combatReducer(deps, playable({ enemies: twoEnemies, hand: [inst('h1', 'strike')] }), {
      ...PLAY_H1,
      targets: [{ side: 'enemy', index: 1 }],
    });
    expect(s.enemies.map((e) => e.entity.hp)).toEqual([20, 12]); // only index 1 took 6
  });
});

// --- EndTurn -----------------------------------------------------------------

describe('EndTurn', () => {
  it('runs the enemy intent, ticks, resets block, restores energy, advances turn, redraws', () => {
    const start = playable({
      energy: 1,
      hand: [inst('h1', 'strike')],
      player: player(50, [{ kind: StatusKind.Block, stacks: 4, lifetime: Lifetime.Fight }]),
    });
    const s = combatReducer(deps, start, END_TURN);
    expect(s.player.hp).toBe(48); // attack 6, block 4 absorbs -> 2 to hp
    expect(block(s.player)).toBe(0); // block consumed + reset
    expect(s.enemies[0]?.currentIntentIndex).toBe(1); // advanced
    expect(s.energy).toBe(3);
    expect(s.turn).toBe(2);
    expect(s.hand).toHaveLength(3); // 1 kept + 2 drawn
  });

  it('ends in Defeat when the enemy kills the player', () => {
    const s = combatReducer(deps, playable({ player: player(3) }), END_TURN);
    expect(s.phase).toBe(CombatPhase.Defeat);
    expect(s.player.hp).toBe(0);
  });

  it('is a no-op off the player turn (same reference)', () => {
    const off = playable({ phase: CombatPhase.Victory });
    expect(combatReducer(deps, off, END_TURN)).toBe(off);
  });
});

// --- Determinism -------------------------------------------------------------

describe('determinism', () => {
  it('replays a Start → EndTurn → EndTurn script identically from the same seed', () => {
    const start: CombatAction = {
      type: 'StartCombat',
      player: player(),
      enemies: [BASHER],
      deck: Array.from({ length: 6 }, (_, i) => inst(`k${i}`, 'strike')),
      seed: seedFrom('replay'),
    };
    const run = (): CombatState =>
      [start, END_TURN, END_TURN].reduce((st, a) => combatReducer(deps, st, a), emptyState());
    expect(run()).toEqual(run());
  });
});
