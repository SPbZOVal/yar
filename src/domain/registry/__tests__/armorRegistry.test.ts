import { ARMOR_DEFS, getArmorDef } from '../armorRegistry';
import { ARMORS, STARTER_ARMOR_ID } from '../../content/armor';

describe('armorRegistry', () => {
  it('indexes every armor definition by id', () => {
    expect(ARMOR_DEFS.size).toBe(ARMORS.length);
    for (const a of ARMORS) expect(getArmorDef(a.id)).toBe(a);
  });

  it('resolves the starter armor', () => {
    expect(() => getArmorDef(STARTER_ARMOR_ID)).not.toThrow();
  });

  it('throws on an unknown id', () => {
    expect(() => getArmorDef('does-not-exist')).toThrow('Unknown armor def');
  });
});
