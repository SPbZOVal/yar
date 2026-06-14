/**
 * Weapon registry — resolve a weapon `id` to its {@link Weapon}.
 *
 * Built from `content/weapons`; used by the loot rollers (equipment pool) and the default
 * player builder. Mirrors `cardRegistry`/`enemyRegistry`.
 */
import type { Weapon } from '../model';
import { WEAPONS } from '../content/weapons';

export const WEAPON_DEFS: ReadonlyMap<string, Weapon> = new Map(WEAPONS.map((w) => [w.id, w]));

/** Resolve a weapon `id`; throws on an unknown id (a content bug, never user input). */
export function getWeaponDef(id: string): Weapon {
  const def = WEAPON_DEFS.get(id);
  if (def === undefined) throw new Error(`Unknown weapon def: ${id}`);
  return def;
}
