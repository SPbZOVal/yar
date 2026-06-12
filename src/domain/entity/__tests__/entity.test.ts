import { Lifetime, StatusKind } from '../../model';
import type { Entity, Status } from '../../model';
import {
  EntityOps,
  applyStatus,
  attackPower,
  block,
  cleanupLifetime,
  clearBlock,
  dealDamage,
  gainBlock,
  gainTempHp,
  maxHp,
  takeDamage,
  tickStatuses,
} from '../entity';

// --- Test helpers ------------------------------------------------------------

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

function entity(overrides: Partial<Entity> = {}): Entity {
  return { hp: 50, baseMaxHp: 50, statuses: [], ...overrides };
}

const kinds = (e: Entity): StatusKind[] => e.statuses.map((s) => s.kind);

// --- Derived readers ---------------------------------------------------------

describe('derived readers', () => {
  it('maxHp adds MaxHpUp and TempHp to baseMaxHp', () => {
    const e = entity({
      statuses: [
        status(StatusKind.MaxHpUp, 10, Lifetime.Permanent),
        status(StatusKind.TempHp, 5),
        status(StatusKind.AttackUp, 3), // irrelevant to maxHp
      ],
    });
    expect(maxHp(e)).toBe(65);
  });

  it('block and attackPower sum only their own kind; default to 0', () => {
    const e = entity({
      statuses: [
        status(StatusKind.Block, 4),
        status(StatusKind.Block, 2),
        status(StatusKind.AttackUp, 6),
      ],
    });
    expect(block(e)).toBe(6);
    expect(attackPower(e)).toBe(6);
    expect(block(entity())).toBe(0);
    expect(attackPower(entity())).toBe(0);
    expect(maxHp(entity())).toBe(50);
  });
});

// --- takeDamage (receiver) ---------------------------------------------------

describe('takeDamage', () => {
  it('absorbs with Block first, then reduces the remainder, leaving residual block', () => {
    const e = entity({ hp: 30, statuses: [status(StatusKind.Block, 4)] });
    const result = takeDamage(e, 10); // incoming 10, block 4 -> 6 to hp
    expect(result.hp).toBe(24);
    expect(block(result)).toBe(0); // 4 absorbed
  });

  it('takes no HP when Block exceeds the hit, leaving residual block', () => {
    const e = entity({ hp: 30, statuses: [status(StatusKind.Block, 15)] });
    const result = takeDamage(e, 10);
    expect(result.hp).toBe(30); // fully absorbed
    expect(block(result)).toBe(5); // 15 - 10
  });

  it('never drives HP below 0', () => {
    expect(takeDamage(entity({ hp: 3 }), 99).hp).toBe(0);
  });

  it('still applies to an already-dead entity', () => {
    expect(takeDamage(entity({ hp: 0 }), 5).hp).toBe(0);
  });

  it('spends Block while leaving other statuses untouched', () => {
    const e = entity({
      hp: 30,
      statuses: [status(StatusKind.Poison, 2), status(StatusKind.Block, 6)],
    });
    const result = takeDamage(e, 4); // fully absorbed by block, 2 block left
    expect(result.hp).toBe(30);
    expect(block(result)).toBe(2);
    expect(result.statuses).toContainEqual(status(StatusKind.Poison, 2));
  });
});

// --- dealDamage (source produces an op applied to the target) ----------------

describe('dealDamage', () => {
  it('produces an op that adds the source attackPower to the base hit', () => {
    const source = entity({ statuses: [status(StatusKind.AttackUp, 3)] });
    const op = dealDamage(source, 5);
    expect(op(entity({ hp: 30 })).hp).toBe(22); // 30 - (5 + 3)
  });

  it('the produced op respects the target Block', () => {
    const op = dealDamage(entity(), 10);
    const result = op(entity({ hp: 30, statuses: [status(StatusKind.Block, 4)] }));
    expect(result.hp).toBe(24);
    expect(block(result)).toBe(0);
  });

  it('does not mutate source or target', () => {
    const source = entity({ statuses: [status(StatusKind.AttackUp, 3)] });
    const target = entity({ hp: 30, statuses: [status(StatusKind.Block, 4)] });
    dealDamage(source, 10)(target);
    expect(target.hp).toBe(30);
    expect(block(target)).toBe(4);
    expect(source.statuses).toHaveLength(1);
  });
});

// --- gainBlock / gainTempHp / applyStatus ------------------------------------

describe('gainBlock', () => {
  it('adds fight-scoped Block', () => {
    const result = gainBlock(entity(), 7);
    expect(block(result)).toBe(7);
    expect(result.statuses[0]?.lifetime).toBe(Lifetime.Fight);
  });

  it('is a no-op for non-positive values (same reference)', () => {
    const e = entity();
    expect(gainBlock(e, 0)).toBe(e);
    expect(gainBlock(e, -3)).toBe(e);
  });
});

describe('gainTempHp', () => {
  it('raises HP above the normal max and tracks a fight-scoped TempHp status', () => {
    const e = entity({ hp: 50, baseMaxHp: 50 });
    const result = gainTempHp(e, 8);
    expect(result.hp).toBe(58); // above baseMaxHp
    expect(maxHp(result)).toBe(58);
    expect(result.statuses).toEqual([status(StatusKind.TempHp, 8)]);
  });

  it('is a no-op for non-positive values (same reference)', () => {
    const e = entity();
    expect(gainTempHp(e, 0)).toBe(e);
  });
});

describe('applyStatus', () => {
  it('appends a new status', () => {
    const result = applyStatus(entity(), StatusKind.Poison, 3, Lifetime.Fight, 2);
    expect(result.statuses).toEqual([status(StatusKind.Poison, 3, Lifetime.Fight, 2)]);
  });

  it('merges same kind + lifetime: stacks sum, remainingTurns takes the longer', () => {
    const e = entity({ statuses: [status(StatusKind.Poison, 2, Lifetime.Fight, 1)] });
    const result = applyStatus(e, StatusKind.Poison, 3, Lifetime.Fight, 4);
    expect(result.statuses).toEqual([status(StatusKind.Poison, 5, Lifetime.Fight, 4)]);
  });

  it('keeps same kind but different lifetime separate', () => {
    const e = entity({ statuses: [status(StatusKind.AttackUp, 2, Lifetime.Run)] });
    const result = applyStatus(e, StatusKind.AttackUp, 3, Lifetime.Fight);
    expect(result.statuses).toHaveLength(2);
    expect(attackPower(result)).toBe(5);
  });

  it('is a no-op for non-positive stacks (same reference)', () => {
    const e = entity();
    expect(applyStatus(e, StatusKind.Block, 0, Lifetime.Fight)).toBe(e);
  });
});

// --- tickStatuses / clearBlock -----------------------------------------------

describe('tickStatuses', () => {
  it('applies poison damage for the current stacks', () => {
    const e = entity({ hp: 30, statuses: [status(StatusKind.Poison, 4)] });
    expect(tickStatuses(e).hp).toBe(26);
  });

  it('decrements turn-decaying statuses and drops those that reach 0', () => {
    const e = entity({
      statuses: [
        status(StatusKind.Poison, 4, Lifetime.Fight, 2),
        status(StatusKind.AttackUp, 1, Lifetime.Fight, 1), // expires this tick
        status(StatusKind.Block, 5), // no remainingTurns -> untouched
      ],
    });
    const result = tickStatuses(e);
    expect(result.statuses).toEqual([
      status(StatusKind.Poison, 4, Lifetime.Fight, 1),
      status(StatusKind.Block, 5),
    ]);
  });

  it('never drives HP below 0 from poison', () => {
    const e = entity({ hp: 2, statuses: [status(StatusKind.Poison, 9)] });
    expect(tickStatuses(e).hp).toBe(0);
  });
});

describe('clearBlock', () => {
  it('removes all Block statuses and keeps the rest', () => {
    const e = entity({
      statuses: [status(StatusKind.Block, 4), status(StatusKind.Poison, 2)],
    });
    expect(kinds(clearBlock(e))).toEqual([StatusKind.Poison]);
  });

  it('returns the same reference when there is no Block', () => {
    const e = entity({ statuses: [status(StatusKind.Poison, 2)] });
    expect(clearBlock(e)).toBe(e);
  });
});

// --- cleanupLifetime ---------------------------------------------------------

describe('cleanupLifetime', () => {
  it('a fight boundary clears only fight statuses', () => {
    const e = entity({
      statuses: [
        status(StatusKind.Block, 4, Lifetime.Fight),
        status(StatusKind.AttackUp, 2, Lifetime.Run),
        status(StatusKind.MaxHpUp, 5, Lifetime.Permanent),
      ],
    });
    const result = cleanupLifetime(e, Lifetime.Fight);
    expect(result.statuses.map((s) => s.lifetime)).toEqual([Lifetime.Run, Lifetime.Permanent]);
  });

  it('a run boundary clears fight and run, keeping life and permanent', () => {
    const e = entity({
      statuses: [
        status(StatusKind.Block, 4, Lifetime.Fight),
        status(StatusKind.AttackUp, 2, Lifetime.Run),
        status(StatusKind.WeaponTier, 1, Lifetime.Life),
        status(StatusKind.MaxHpUp, 5, Lifetime.Permanent),
      ],
    });
    const result = cleanupLifetime(e, Lifetime.Run);
    expect(result.statuses.map((s) => s.lifetime)).toEqual([Lifetime.Life, Lifetime.Permanent]);
  });

  it('re-clamps HP when removing a fight-scoped max bonus (temp HP lost)', () => {
    const e = gainTempHp(entity({ hp: 50, baseMaxHp: 50 }), 10); // hp 60, max 60
    const result = cleanupLifetime(e, Lifetime.Fight);
    expect(result.hp).toBe(50);
    expect(maxHp(result)).toBe(50);
  });

  it('returns the same reference when nothing matches the boundary', () => {
    const e = entity({ statuses: [status(StatusKind.MaxHpUp, 5, Lifetime.Permanent)] });
    expect(cleanupLifetime(e, Lifetime.Fight)).toBe(e);
  });
});

// --- immutability / aggregate ------------------------------------------------

describe('immutability', () => {
  it('does not mutate the input entity or its statuses array', () => {
    const e = entity({ statuses: [status(StatusKind.Poison, 3, Lifetime.Fight, 2)] });
    const before = e.statuses.length;
    gainBlock(e, 5);
    applyStatus(e, StatusKind.AttackUp, 2, Lifetime.Fight);
    tickStatuses(e);
    expect(e.statuses).toHaveLength(before);
    expect(e.hp).toBe(50);
  });
});

describe('EntityOps aggregate', () => {
  it('exposes every operation', () => {
    expect(Object.keys(EntityOps).sort()).toEqual(
      [
        'applyStatus',
        'attackPower',
        'block',
        'cleanupLifetime',
        'clearBlock',
        'dealDamage',
        'gainBlock',
        'gainTempHp',
        'maxHp',
        'takeDamage',
        'tickStatuses',
      ].sort(),
    );
  });
});
