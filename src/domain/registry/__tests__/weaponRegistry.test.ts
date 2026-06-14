import { WEAPON_DEFS, getWeaponDef } from '../weaponRegistry';
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
