/**
 * Weapon content — pure data, no logic. A weapon adds to outgoing attack damage (the run
 * projects `attackBonus` into combat as an `AttackUp` status). `satisfies readonly Weapon[]`
 * validates every entry; adding a weapon is appending one here. `tier` orders the loot pool.
 */
import type { Weapon } from '../model';

/** Id of the weapon every new run starts with (a bare fist: no bonus). */
export const STARTER_WEAPON_ID = 'fist';

export const WEAPONS = [
  { id: 'fist', name: 'Fist', attackBonus: 0, tier: 0 },
  { id: 'dagger', name: 'Dagger', attackBonus: 2, tier: 1 },
  { id: 'sword', name: 'Sword', attackBonus: 4, tier: 2 },
  { id: 'axe', name: 'Battle Axe', attackBonus: 7, tier: 3 },
] satisfies readonly Weapon[];
