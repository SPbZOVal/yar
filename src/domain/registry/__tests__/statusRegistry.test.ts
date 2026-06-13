import { Lifetime, StatusKind } from '../../model';
import type { Entity, Status } from '../../model';
import { STATUS_REGISTRY, getStatusBehavior } from '../statusRegistry';

function entity(overrides: Partial<Entity> = {}): Entity {
  return { hp: 50, baseMaxHp: 50, statuses: [], ...overrides };
}

function status(kind: StatusKind, stacks: number, lifetime: Lifetime = Lifetime.Fight): Status {
  return { kind, stacks, lifetime };
}

describe('STATUS_REGISTRY', () => {
  it('has a behavior with a default lifetime for every status kind (exhaustive)', () => {
    for (const kind of Object.values(StatusKind)) {
      expect(getStatusBehavior(kind).defaultLifetime).toBeTruthy();
    }
  });

  it('Damage.apply deals stacks + source attackPower, absorbed by target Block', () => {
    const apply = STATUS_REGISTRY[StatusKind.Damage].apply;
    // Source carries non-attack statuses too; only AttackUp feeds the hit.
    const source = entity({
      statuses: [
        status(StatusKind.AttackUp, 3),
        status(StatusKind.Block, 2),
        status(StatusKind.Poison, 1),
      ],
    });
    const target = entity({ hp: 30, statuses: [status(StatusKind.Block, 4)] });
    const result = apply!(target, { source, stacks: 5, lifetime: Lifetime.Instant });
    expect(result.hp).toBe(26); // incoming 5 + 3 = 8, block 4 -> 4 to hp
  });

  it('TempHp.apply heals and raises max above the normal cap', () => {
    const apply = STATUS_REGISTRY[StatusKind.TempHp].apply;
    const result = apply!(entity({ hp: 50, baseMaxHp: 50 }), {
      source: entity(),
      stacks: 8,
      lifetime: Lifetime.Fight,
    });
    expect(result.hp).toBe(58);
    expect(result.statuses).toEqual([status(StatusKind.TempHp, 8)]);
  });

  it('reports stat contributions for the stat-bearing kinds', () => {
    expect(STATUS_REGISTRY[StatusKind.Block].stat!(status(StatusKind.Block, 5))).toEqual({
      block: 5,
    });
    expect(STATUS_REGISTRY[StatusKind.AttackUp].stat!(status(StatusKind.AttackUp, 2))).toEqual({
      attack: 2,
    });
    expect(STATUS_REGISTRY[StatusKind.MaxHpUp].stat!(status(StatusKind.MaxHpUp, 7))).toEqual({
      maxHp: 7,
    });
    expect(STATUS_REGISTRY[StatusKind.TempHp].stat!(status(StatusKind.TempHp, 4))).toEqual({
      maxHp: 4,
    });
  });

  it('Poison.onTick deals stacks directly, bypassing Block', () => {
    const onTick = STATUS_REGISTRY[StatusKind.Poison].onTick;
    const e = entity({ hp: 30, statuses: [status(StatusKind.Block, 10)] });
    expect(onTick!(e, status(StatusKind.Poison, 4)).hp).toBe(26); // block ignored
  });

  it('WeaponTier is an inert marker (no stat/onTick/apply)', () => {
    const b = STATUS_REGISTRY[StatusKind.WeaponTier];
    expect(b.stat).toBeUndefined();
    expect(b.onTick).toBeUndefined();
    expect(b.apply).toBeUndefined();
  });
});
