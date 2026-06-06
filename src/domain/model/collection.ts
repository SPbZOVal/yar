/** Meta-level collection & run deck. See docs/architecture/03-data-model.md §7.3. */
import type { CardInstance } from './cards';
import type { Armor, Weapon } from './player';

/**
 * Persistent store of everything the player has unlocked (the `metaSlice`, §6.2).
 * New cards from combat/chests/bosses land here — never directly into the active deck (§10.2).
 */
export interface Collection {
  readonly ownedCards: readonly CardInstance[];
  readonly ownedWeapons: readonly Weapon[];
  readonly ownedArmor: readonly Armor[];
}

/**
 * The N cards selected from the {@link Collection} before a level. Fixed for the
 * whole level; not replenished mid-run. `maxDeckSize` caps N. (§7.3, §10.2)
 */
export interface RunDeck {
  readonly cardInstanceIds: readonly string[];
  readonly maxDeckSize: number;
}
