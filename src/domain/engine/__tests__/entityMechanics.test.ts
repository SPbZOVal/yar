import { Lifetime, StatusKind } from '../../model';
import type { Entity, Status } from '../../model';
import {
  LIFETIME_ORDER,
  clampHpTo,
  damageInto,
  heal,
  makeStatus,
  maxDuration,
  reduceStatus,
  storeStatus,
  sumStacks,
} from '../entityMechanics';

function entity(overrides: Partial<Entity> = {}): Entity {
  return { hp: 50, baseMaxHp: 50, statuses: [], ...overrides };
}

function status(
  kind: StatusKind,
  stacks: number,
  lifetime: Lifetime = Lifetime.Fight,
  remainingTurns?: number,
): Status {
  return remainingTurns === undefined
    ? { kind, stacks, lifetime }
    : { kind, stacks, lifetime, remainingTurns };
}

describe('sumStacks', () => {
  it('sums only the matching kind', () => {
    const e = entity({ statuses: [status(StatusKind.Block, 3), status(StatusKind.Block, 2)] });
    expect(sumStacks(e, StatusKind.Block)).toBe(5);
    expect(sumStacks(e, StatusKind.Poison)).toBe(0);
  });
});

describe('makeStatus', () => {
  it('omits remainingTurns when undefined', () => {
    expect(makeStatus(StatusKind.Block, 2, Lifetime.Fight)).toEqual({
      kind: StatusKind.Block,
      stacks: 2,
      lifetime: Lifetime.Fight,
    });
    expect(makeStatus(StatusKind.Poison, 2, Lifetime.Fight, 3).remainingTurns).toBe(3);
  });
});

describe('maxDuration', () => {
  it('covers both-undefined, one-undefined, and both-defined', () => {
    expect(maxDuration(undefined, undefined)).toBeUndefined();
    expect(maxDuration(undefined, 3)).toBe(3);
    expect(maxDuration(3, undefined)).toBe(3);
    expect(maxDuration(2, 5)).toBe(5);
  });
});

describe('reduceStatus', () => {
  it('drains stacks in order and drops emptied statuses', () => {
    const e = entity({ statuses: [status(StatusKind.Block, 2), status(StatusKind.Block, 3)] });
    const result = reduceStatus(e, StatusKind.Block, 3);
    expect(result.statuses).toEqual([status(StatusKind.Block, 2)]); // first emptied, second 3-1
  });

  it('is a no-op for non-positive amounts', () => {
    const e = entity({ statuses: [status(StatusKind.Block, 2)] });
    expect(reduceStatus(e, StatusKind.Block, 0)).toBe(e);
  });
});

describe('storeStatus', () => {
  it('appends a new status', () => {
    expect(storeStatus(entity(), StatusKind.Poison, 3, Lifetime.Fight, 2).statuses).toEqual([
      status(StatusKind.Poison, 3, Lifetime.Fight, 2),
    ]);
  });

  it('merges the same kind + lifetime (stacks sum)', () => {
    const e = entity({ statuses: [status(StatusKind.Block, 2)] });
    expect(storeStatus(e, StatusKind.Block, 3, Lifetime.Fight).statuses).toEqual([
      status(StatusKind.Block, 5),
    ]);
  });

  it('keeps the same kind with a different lifetime separate', () => {
    const e = entity({ statuses: [status(StatusKind.AttackUp, 2, Lifetime.Run)] });
    expect(storeStatus(e, StatusKind.AttackUp, 3, Lifetime.Fight).statuses).toHaveLength(2);
  });
});

describe('clampHpTo', () => {
  it('clamps down to the cap and is a no-op when in range', () => {
    expect(clampHpTo(entity({ hp: 60 }), 50).hp).toBe(50);
    const e = entity({ hp: 40 });
    expect(clampHpTo(e, 50)).toBe(e);
  });
});

describe('heal', () => {
  it('heals up to the cap; no-op for non-positive or at-cap', () => {
    expect(heal(entity({ hp: 40 }), 5, 50).hp).toBe(45);
    expect(heal(entity({ hp: 48 }), 5, 50).hp).toBe(50); // capped
    const e = entity({ hp: 40 });
    expect(heal(e, 0, 50)).toBe(e);
  });
});

describe('damageInto', () => {
  it('absorbs with Block then reduces HP, never below 0', () => {
    const e = entity({ hp: 30, statuses: [status(StatusKind.Block, 4)] });
    const result = damageInto(e, 10);
    expect(result.hp).toBe(24);
    expect(sumStacks(result, StatusKind.Block)).toBe(0);
    expect(damageInto(entity({ hp: 3 }), 99).hp).toBe(0);
  });
});

describe('LIFETIME_ORDER', () => {
  it('orders Instant < Fight < Run < Life < Permanent', () => {
    expect(LIFETIME_ORDER[Lifetime.Instant]).toBeLessThan(LIFETIME_ORDER[Lifetime.Fight]);
    expect(LIFETIME_ORDER[Lifetime.Fight]).toBeLessThan(LIFETIME_ORDER[Lifetime.Run]);
    expect(LIFETIME_ORDER[Lifetime.Run]).toBeLessThan(LIFETIME_ORDER[Lifetime.Life]);
    expect(LIFETIME_ORDER[Lifetime.Life]).toBeLessThan(LIFETIME_ORDER[Lifetime.Permanent]);
  });
});
