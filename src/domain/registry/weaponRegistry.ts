/**
 * Weapon registry — resolve a weapon `id` to its {@link Weapon}.
 *
 * Built from `content/weapons`; used by the loot rollers (equipment pool) and the default
 * player builder. Mirrors `cardRegistry`/`enemyRegistry`.
 */
import type { Weapon } from '../model';
import { WEAPONS } from '../content/weapons';

export const WEAPON_DEFS: ReadonlyMap<string, Weapon> = new Map(WEAPONS.map((w) => [w.id, w]));

/** The weapon pool ordered low → high tier — the ladder an upgrade walks up. */
export const WEAPONS_BY_TIER: readonly Weapon[] = [...WEAPONS].sort((a, b) => a.tier - b.tier);

/** Resolve a weapon `id`; throws on an unknown id (a content bug, never user input). */
export function getWeaponDef(id: string): Weapon {
  const def = WEAPON_DEFS.get(id);
  if (def === undefined) throw new Error(`Unknown weapon def: ${id}`);
  return def;
}

/**
 * Step `current` up the tier ladder by `steps` (a "upgrade weapon" special), clamped at the top.
 * Falls back to the first weapon at-or-above `current.tier` when `current` itself isn't in the
 * pool, so an off-pool weapon still advances sensibly. Returns `current` for non-positive `steps`.
 */
export function upgradeWeapon(current: Weapon, steps: number): Weapon {
  if (steps <= 0 || WEAPONS_BY_TIER.length === 0) return current;
  const top = WEAPONS_BY_TIER.length - 1;
  const idx = WEAPONS_BY_TIER.findIndex((w) => w.id === current.id);
  if (idx >= 0) return WEAPONS_BY_TIER[Math.min(top, idx + steps)] ?? current;
  // Off-pool weapon: jump to the first strictly-higher tier, then spend the remaining steps.
  const next = WEAPONS_BY_TIER.findIndex((w) => w.tier > current.tier);
  if (next < 0) return current; // already above the whole ladder
  return WEAPONS_BY_TIER[Math.min(top, next + (steps - 1))] ?? current;
}
