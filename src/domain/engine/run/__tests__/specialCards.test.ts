import {
  CardCategory,
  CardType,
  Lifetime,
  Rarity,
  StatusKind,
  Targeting,
  TargetType,
} from '../../../model';
import type { CardDefinition, Effect, PlayerState, Weapon } from '../../../model';
import { applySpecialCard } from '../specialCards';
import type { SpecialCardDeps } from '../specialCards';

const fist: Weapon = { id: 'fist', name: 'Fist', attackBonus: 0, tier: 0 };
const sword: Weapon = { id: 'sword', name: 'Sword', attackBonus: 4, tier: 2 };
const armor = { id: 'rags', name: 'Rags', maxHpBonus: 0, blockBonus: 0, tier: 0 };

const player = (currentHp = 40, maxHp = 50): PlayerState => ({
  baseMaxHp: 50,
  currentHp,
  maxHp,
  handSize: 5,
  energyPerTurn: 3,
  weapon: fist,
  armor,
});

// A fake that records the step and returns a recognisable upgraded weapon.
const deps: SpecialCardDeps = { upgradeWeapon: () => sword };

function special(effects: readonly Effect[]): CardDefinition {
  return {
    id: 'special',
    name: '',
    description: '',
    type: CardType.SingleUse,
    category: CardCategory.Special,
    cost: 0,
    effects,
    rarity: Rarity.Boss,
    targeting: Targeting.One,
    isSpecial: true,
  };
}

const heart = (value: number): Effect => ({
  kind: 'ApplyStatus',
  value,
  target: TargetType.Self,
  status: StatusKind.MaxHpUp,
  lifetime: Lifetime.Permanent,
});
const upgrade: Effect = {
  kind: 'ApplyStatus',
  value: 1,
  target: TargetType.Self,
  status: StatusKind.WeaponTier,
  lifetime: Lifetime.Life,
};

describe('applySpecialCard', () => {
  it('"+heart" raises maxHp and heals by the same amount', () => {
    const p = applySpecialCard(player(40, 50), special([heart(5)]), deps);
    expect(p.maxHp).toBe(55);
    expect(p.currentHp).toBe(45);
  });

  it('a "+heart" heal never exceeds the new maxHp', () => {
    const p = applySpecialCard(player(50, 50), special([heart(5)]), deps);
    expect(p.maxHp).toBe(55);
    expect(p.currentHp).toBe(55); // 50 + 5, capped at the raised max
  });

  it('"upgrade weapon" steps the equipped weapon via the dep', () => {
    const p = applySpecialCard(player(), special([upgrade]), deps);
    expect(p.weapon).toBe(sword);
  });

  it('folds multiple effects on one card', () => {
    const p = applySpecialCard(player(40, 50), special([heart(5), upgrade]), deps);
    expect(p.maxHp).toBe(55);
    expect(p.weapon).toBe(sword);
  });

  it('ignores effects that are not Self ApplyStatus of a meta kind', () => {
    const damage: Effect = {
      kind: 'ApplyStatus',
      value: 6,
      target: TargetType.Targets,
      status: StatusKind.Damage,
      lifetime: Lifetime.Instant,
    };
    const before = player();
    expect(applySpecialCard(before, special([damage]), deps)).toEqual(before);
  });
});
