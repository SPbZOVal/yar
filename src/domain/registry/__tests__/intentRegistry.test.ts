import { CombatPhase, Lifetime, StatusKind } from '../../model';
import type { CombatState, Entity, EnemyInstance } from '../../model';
import { attackPower, block } from '../../entity/entity';
import { INTENT_HANDLERS, getIntentHandler } from '../intentRegistry';

const player: Entity = { hp: 50, baseMaxHp: 50, statuses: [] };

const enemyInst = (entity: Entity): EnemyInstance => ({
  entity,
  defId: 'e',
  currentIntentIndex: 0,
});

function combat(enemies: readonly EnemyInstance[], p: Entity = player): CombatState {
  return {
    player: p,
    enemies,
    drawPile: [],
    hand: [],
    discardPile: [],
    exhaustPile: [],
    energy: 3,
    turn: 1,
    phase: CombatPhase.PlayerTurn,
    rng: 0,
  };
}

describe('getIntentHandler', () => {
  it('resolves known kinds and returns undefined for an unknown one', () => {
    expect(getIntentHandler('attack')).toBe(INTENT_HANDLERS.attack);
    expect(getIntentHandler('does-not-exist')).toBeUndefined();
  });
});

describe('attack', () => {
  it('damages the player, scaled by the enemy attack power, after block', () => {
    const enemy = enemyInst({
      hp: 10,
      baseMaxHp: 10,
      statuses: [{ kind: StatusKind.AttackUp, stacks: 2, lifetime: Lifetime.Fight }],
    });
    const s = INTENT_HANDLERS.attack!(combat([enemy]), 0, 3); // 3 + 2 attack power
    expect(s.player.hp).toBe(45);
  });

  it('is a no-op for an out-of-range enemy index', () => {
    const s = combat([enemyInst({ hp: 10, baseMaxHp: 10, statuses: [] })]);
    expect(INTENT_HANDLERS.attack!(s, 5, 4)).toBe(s);
  });
});

describe('block', () => {
  it('shields the acting enemy (and only it)', () => {
    const a = enemyInst({ hp: 10, baseMaxHp: 10, statuses: [] });
    const b = enemyInst({ hp: 10, baseMaxHp: 10, statuses: [] });
    const s = INTENT_HANDLERS.block!(combat([a, b]), 0, 4);
    expect(s.enemies[0] && block(s.enemies[0].entity)).toBe(4);
    expect(s.enemies[1] && block(s.enemies[1].entity)).toBe(0);
    expect(s.player).toBe(player); // player untouched
  });
});

describe('buff', () => {
  it('raises the acting enemy attack power for the fight', () => {
    const enemy = enemyInst({ hp: 10, baseMaxHp: 10, statuses: [] });
    const s = INTENT_HANDLERS.buff!(combat([enemy]), 0, 3);
    expect(s.enemies[0] && attackPower(s.enemies[0].entity)).toBe(3);
  });
});

describe('poison', () => {
  it('applies decaying Poison to the player', () => {
    const enemy = enemyInst({ hp: 10, baseMaxHp: 10, statuses: [] });
    const s = INTENT_HANDLERS.poison!(combat([enemy]), 0, 3);
    expect(s.player.statuses).toEqual([
      { kind: StatusKind.Poison, stacks: 3, lifetime: Lifetime.Fight, remainingTurns: 3 },
    ]);
  });
});
