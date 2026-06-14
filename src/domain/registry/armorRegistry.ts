/**
 * Armor registry — resolve an armor `id` to its {@link Armor}.
 *
 * Built from `content/armor`; used by the loot rollers (equipment pool) and the default
 * player builder. Mirrors `cardRegistry`/`enemyRegistry`.
 */
import type { Armor } from '../model';
import { ARMORS } from '../content/armor';

export const ARMOR_DEFS: ReadonlyMap<string, Armor> = new Map(ARMORS.map((a) => [a.id, a]));

/** Resolve an armor `id`; throws on an unknown id (a content bug, never user input). */
export function getArmorDef(id: string): Armor {
  const def = ARMOR_DEFS.get(id);
  if (def === undefined) throw new Error(`Unknown armor def: ${id}`);
  return def;
}
