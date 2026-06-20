import {
  CardCategory,
  CardType,
  CombatPhase,
  DeckOp,
  Lifetime,
  Rarity,
  StatusKind,
  Targeting,
  TargetType,
} from '../../model';
import type {
  ApplyStatusEffect,
  CardDefinition,
  CardInstance,
  CombatState,
  DeckManipulationEffect,
  Effect,
  EnemyInstance,
  Entity,
} from '../../model';
import { attackPower, block, maxHp } from '../../entity/entity';
import { CardResolver, applyCard, compile } from '../cardResolver';
import type { CombatantRef } from '../cardResolver';

// --- Test helpers ------------------------------------------------------------

function entity(overrides: Partial<Entity> = {}): Entity {
  return { hp: 50, baseMaxHp: 50, statuses: [], ...overrides };
}

function enemy(e: Entity, defId = 'e'): EnemyInstance {
  return { entity: e, defId, currentIntentIndex: 0 };
}

function combatState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    player: entity(),
    enemies: [],
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

function card(...effects: Effect[]): CardDefinition {
  return {
    id: 'c',
    name: 'n',
    description: '',
    type: CardType.Permanent,
    category: CardCategory.Attack,
    cost: 1,
    effects,
    rarity: Rarity.Common,
    targeting: Targeting.One,
    isSpecial: false,
  };
}

function inst(id: string): CardInstance {
  return { instanceId: id, defId: 'd', upgraded: false };
}

function damage(value: number, target: TargetType = TargetType.Targets): ApplyStatusEffect {
  return {
    kind: 'ApplyStatus',
    value,
    target,
    status: StatusKind.Damage,
    lifetime: Lifetime.Instant,
  };
}

function buff(
  status: StatusKind,
  value: number,
  lifetime: Lifetime = Lifetime.Fight,
  target: TargetType = TargetType.Self,
): ApplyStatusEffect {
  return { kind: 'ApplyStatus', value, target, status, lifetime };
}

function deck(op: DeckOp, value = 0): DeckManipulationEffect {
  return { kind: 'DeckManipulation', op, value };
}

const PLAYER: CombatantRef = { side: 'player' };
const enemyRef = (index: number): CombatantRef => ({ side: 'enemy', index });

// --- Damage (one-time status) ------------------------------------------------

describe('applyCard — Damage', () => {
  it('hits a single targeted enemy', () => {
    const state = combatState({ enemies: [enemy(entity({ hp: 30 }))] });
    const result = applyCard(state, card(damage(8)), PLAYER, [enemyRef(0)]);
    expect(result.enemies[0]?.entity.hp).toBe(22);
  });

  it("folds the source's attackPower into the hit", () => {
    const state = combatState({
      player: entity({
        statuses: [{ kind: StatusKind.AttackUp, stacks: 3, lifetime: Lifetime.Run }],
      }),
      enemies: [enemy(entity({ hp: 30 }))],
    });
    const result = applyCard(state, card(damage(5)), PLAYER, [enemyRef(0)]);
    expect(result.enemies[0]?.entity.hp).toBe(22); // 30 - (5 + 3)
  });

  it('respects the target Block', () => {
    const state = combatState({
      enemies: [
        enemy(
          entity({
            hp: 30,
            statuses: [{ kind: StatusKind.Block, stacks: 4, lifetime: Lifetime.Fight }],
          }),
        ),
      ],
    });
    const result = applyCard(state, card(damage(10)), PLAYER, [enemyRef(0)]);
    expect(result.enemies[0]?.entity.hp).toBe(24);
    expect(block(result.enemies[0]!.entity)).toBe(0);
  });

  it('hits every ref for a multi-target play', () => {
    const state = combatState({ enemies: [enemy(entity({ hp: 30 })), enemy(entity({ hp: 30 }))] });
    const result = applyCard(state, card(damage(8)), PLAYER, [enemyRef(0), enemyRef(1)]);
    expect(result.enemies.map((en) => en.entity.hp)).toEqual([22, 22]);
  });

  it('is not stored as a status on the target', () => {
    const state = combatState({ enemies: [enemy(entity({ hp: 30 }))] });
    const result = applyCard(state, card(damage(8)), PLAYER, [enemyRef(0)]);
    expect(result.enemies[0]?.entity.statuses).toHaveLength(0);
  });
});

describe('compile', () => {
  it('produces a damage op closing over the source attackPower', () => {
    const source = entity({
      statuses: [{ kind: StatusKind.AttackUp, stacks: 2, lifetime: Lifetime.Fight }],
    });
    const op = compile(damage(5), source);
    expect(op(entity({ hp: 30 })).hp).toBe(23); // 30 - (5 + 2)
  });
});

// --- Stored statuses ---------------------------------------------------------

describe('applyCard — stored statuses', () => {
  it('adds Block to the caster for a Self effect', () => {
    const result = applyCard(combatState(), card(buff(StatusKind.Block, 5)), PLAYER, []);
    expect(block(result.player)).toBe(5);
  });

  it('applies Poison to the targets', () => {
    const state = combatState({ enemies: [enemy(entity({ hp: 30 }))] });
    const poison: ApplyStatusEffect = {
      kind: 'ApplyStatus',
      value: 3,
      target: TargetType.Targets,
      status: StatusKind.Poison,
      lifetime: Lifetime.Fight,
      duration: 2,
    };
    const result = applyCard(state, card(poison), PLAYER, [enemyRef(0)]);
    expect(result.enemies[0]?.entity.statuses).toEqual([
      { kind: StatusKind.Poison, stacks: 3, lifetime: Lifetime.Fight, remainingTurns: 2 },
    ]);
  });

  it('TempHp heals the caster and raises max HP', () => {
    const result = applyCard(combatState(), card(buff(StatusKind.TempHp, 8)), PLAYER, []);
    expect(result.player.hp).toBe(58);
    expect(maxHp(result.player)).toBe(58);
  });
});

// --- Deck manipulation -------------------------------------------------------

describe('applyCard — DeckManipulation', () => {
  it('Draw moves cards from the draw pile into the hand', () => {
    const state = combatState({ drawPile: [inst('a'), inst('b'), inst('c')] });
    const result = applyCard(state, card(deck(DeckOp.Draw, 2)), PLAYER, []);
    expect(result.hand.map((c) => c.instanceId)).toEqual(['a', 'b']);
    expect(result.drawPile).toHaveLength(1);
  });

  it('Reshuffle moves the discard pile back into the draw pile', () => {
    const state = combatState({ discardPile: [inst('x'), inst('y')] });
    const result = applyCard(state, card(deck(DeckOp.Reshuffle)), PLAYER, []);
    expect(result.drawPile).toHaveLength(2);
    expect(result.discardPile).toHaveLength(0);
  });
});

// --- Multiple effects & ordering ---------------------------------------------

describe('applyCard — multiple effects', () => {
  it('folds effects left-to-right: gain Block (Self) + Damage (Targets)', () => {
    const state = combatState({ enemies: [enemy(entity({ hp: 30 }))] });
    const result = applyCard(state, card(buff(StatusKind.Block, 6), damage(8)), PLAYER, [
      enemyRef(0),
    ]);
    expect(block(result.player)).toBe(6);
    expect(result.enemies[0]?.entity.hp).toBe(22);
  });

  it('re-reads the source so an earlier Self AttackUp boosts a later Damage', () => {
    const state = combatState({ enemies: [enemy(entity({ hp: 30 }))] });
    const result = applyCard(state, card(buff(StatusKind.AttackUp, 4), damage(5)), PLAYER, [
      enemyRef(0),
    ]);
    expect(result.enemies[0]?.entity.hp).toBe(21); // 30 - (5 + 4)
    expect(attackPower(result.player)).toBe(4);
  });
});

// --- Edges & immutability ----------------------------------------------------

describe('applyCard — edges & immutability', () => {
  it('is a no-op for an out-of-range enemy ref (same reference)', () => {
    const state = combatState({ enemies: [enemy(entity({ hp: 30 }))] });
    expect(applyCard(state, card(damage(8)), PLAYER, [enemyRef(5)])).toBe(state);
  });

  it('is a no-op for an empty target list on a Targets effect (same reference)', () => {
    const state = combatState({ enemies: [enemy(entity({ hp: 30 }))] });
    expect(applyCard(state, card(damage(8)), PLAYER, [])).toBe(state);
  });

  it('is a no-op when the source ref is missing (same reference)', () => {
    const state = combatState();
    expect(applyCard(state, card(buff(StatusKind.Block, 5)), enemyRef(9), [])).toBe(state);
  });

  it('does not mutate the input state or its enemies', () => {
    const state = combatState({ enemies: [enemy(entity({ hp: 30 }))] });
    applyCard(state, card(damage(8)), PLAYER, [enemyRef(0)]);
    expect(state.enemies[0]?.entity.hp).toBe(30);
    expect(state.player.statuses).toHaveLength(0);
  });
});

describe('CardResolver aggregate', () => {
  it('exposes applyCard and compile', () => {
    expect(CardResolver.applyCard).toBe(applyCard);
    expect(CardResolver.compile).toBe(compile);
  });
});
