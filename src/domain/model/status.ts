/**
 * Typed status model.
 *
 * Every combat modifier an entity can carry is a *status*: a shield is `Block`,
 * weapon attack and strength are `AttackUp`, a "+heart" is `MaxHpUp`, and so on.
 * Because all modifiers live on the entity, the stat operations never take a
 * `weaponBonus`/`statusModifier` argument — they derive everything from the
 * entity's `statuses` (see the entity-operations module).
 *
 * Team convention (see ./enums.ts): every enumeration is an `as const` object plus
 * a derived union type, never a TypeScript `enum` — Babel/Metro safe and
 * JSON-serializable for MMKV saves.
 */

/**
 * Lifetime scope of a status — the boundary at which it is cleaned up.
 *  - `Fight`     — cleared when the combat ends (block, temp-HP, poison, strength).
 *  - `Run`       — cleared when the run ends (e.g. the run's equipped weapon).
 *  - `Life`      — cleared on death.
 *  - `Permanent` — never cleared (meta progression).
 *
 * The order Fight < Run < Life < Permanent is meaningful: ending a longer boundary
 * also clears everything shorter-lived (a run end clears Fight statuses too).
 */
export const Lifetime = {
  Fight: 'fight',
  Run: 'run',
  Life: 'life',
  Permanent: 'permanent',
} as const;
export type Lifetime = (typeof Lifetime)[keyof typeof Lifetime];

/**
 * What a status does is encoded by its `kind`; the engine interprets known kinds.
 *  - `Block`      — absorbs incoming damage; reset at the start of the owner's turn.
 *  - `TempHp`     — fight-scoped bonus max HP plus a heal (lets HP exceed normal max).
 *  - `AttackUp`   — raises outgoing damage (weapon bonus, strength buff).
 *  - `MaxHpUp`    — raises max HP ("+heart" specials).
 *  - `Poison`     — deals `stacks` damage each turn tick.
 *  - `WeaponTier` — upgrade marker carried by the player entity.
 */
export const StatusKind = {
  Block: 'Block',
  TempHp: 'TempHp',
  AttackUp: 'AttackUp',
  MaxHpUp: 'MaxHpUp',
  Poison: 'Poison',
  WeaponTier: 'WeaponTier',
} as const;
export type StatusKind = (typeof StatusKind)[keyof typeof StatusKind];

/**
 * A typed, stackable status on an entity. Statuses of the same `kind` **and**
 * `lifetime` stack (their `stacks` sum); differing lifetimes stay separate so they
 * clean up independently (a run-scoped weapon AttackUp never merges with a
 * fight-scoped strength AttackUp).
 *
 * `remainingTurns` is the intra-fight decay counter; when absent the status does
 * not decay per turn and is removed only by its lifetime boundary.
 */
export interface Status {
  readonly kind: StatusKind;
  readonly stacks: number;
  readonly lifetime: Lifetime;
  readonly remainingTurns?: number;
}
