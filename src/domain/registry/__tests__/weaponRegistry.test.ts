import type { Weapon } from '../../model';
import { WEAPON_DEFS, WEAPONS_BY_TIER, getWeaponDef, upgradeWeapon } from '../weaponRegistry';
import { STARTER_WEAPON_ID, WEAPONS } from '../../content/weapons';

describe('weaponRegistry', () => {
  it('indexes every weapon definition by id', () => {
    expect(WEAPON_DEFS.size).toBe(WEAPONS.length);
    for (const w of WEAPONS) expect(getWeaponDef(w.id)).toBe(w);
  });

  it('resolves the starter weapon', () => {
    expect(() => getWeaponDef(STARTER_WEAPON_ID)).not.toThrow();
  });

  it('throws on an unknown id', () => {
    expect(() => getWeaponDef('does-not-exist')).toThrow('Unknown weapon def');
  });
});

describe('upgradeWeapon', () => {
  const top = WEAPONS_BY_TIER[WEAPONS_BY_TIER.length - 1] as Weapon;

  it('steps up the tier ladder', () => {
    const fist = getWeaponDef('fist');
    expect(upgradeWeapon(fist, 1).id).toBe(WEAPONS_BY_TIER[1]?.id); // fist (tier 0) -> tier 1
    expect(upgradeWeapon(fist, 2).id).toBe(WEAPONS_BY_TIER[2]?.id);
  });

  it('clamps at the highest tier', () => {
    expect(upgradeWeapon(getWeaponDef('fist'), 99)).toBe(top);
    expect(upgradeWeapon(top, 1)).toBe(top);
  });

  it('is a no-op for non-positive steps', () => {
    const sword = getWeaponDef('sword');
    expect(upgradeWeapon(sword, 0)).toBe(sword);
  });

  it('tolerates a weapon not in the pool by advancing from the next higher tier', () => {
    const offPool: Weapon = { id: 'mystery', name: 'Mystery', attackBonus: 3, tier: 0 };
    // tier 0, first strictly-higher tier is index 1; 1 step lands there.
    expect(upgradeWeapon(offPool, 1).id).toBe(WEAPONS_BY_TIER[1]?.id);
  });
});
