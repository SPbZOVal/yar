/**
 * Armor content — pure data, no logic. Armor adds to max HP (projected into combat as a
 * `MaxHpUp` status) and carries a passive block bonus (not yet applied in combat — see the
 * deferred passive-block note in the run engine). `satisfies readonly Armor[]` validates each
 * entry; adding armor is appending one here. `tier` orders the loot pool.
 */
import type { Armor } from '../model';

/** Id of the armor every new run starts with (rags: no bonus). */
export const STARTER_ARMOR_ID = 'rags';

export const ARMORS = [
  { id: 'rags', name: 'Rags', maxHpBonus: 0, blockBonus: 0, tier: 0 },
  { id: 'leather', name: 'Leather', maxHpBonus: 8, blockBonus: 1, tier: 1 },
  { id: 'chain', name: 'Chainmail', maxHpBonus: 15, blockBonus: 2, tier: 2 },
  { id: 'plate', name: 'Plate', maxHpBonus: 25, blockBonus: 3, tier: 3 },
] satisfies readonly Armor[];
