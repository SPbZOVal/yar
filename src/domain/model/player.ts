/** Player and equipment data model. See docs/architecture/03-data-model.md §7.2. */

/** A weapon adds to outgoing attack damage. (§12.2) */
export interface Weapon {
  readonly id: string;
  readonly name: string;
  readonly attackBonus: number;
  readonly tier: number;
}

/** Armor adds to max HP and passive block. (§12.2) */
export interface Armor {
  readonly id: string;
  readonly name: string;
  readonly maxHpBonus: number;
  readonly blockBonus: number;
  readonly tier: number;
}

/**
 * Player meta-state carried through a run.
 * `maxHp = baseMaxHp + armor.maxHpBonus + specialCardsBonus` (see RuleSet.maxHpFormula).
 */
export interface PlayerState {
  readonly baseMaxHp: number;
  readonly currentHp: number;
  readonly maxHp: number;
  /** Cards drawn per turn. */
  readonly handSize: number;
  /** Energy restored each turn (resource for playing cards). */
  readonly energyPerTurn: number;
  readonly weapon: Weapon;
  readonly armor: Armor;
}
