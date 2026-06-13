/**
 * Enumerated domain values.
 *
 * Team convention: every "enumeration" from the data model (docs/architecture/03-data-model.md)
 * is expressed as an `as const` object plus a derived union type — NOT a TypeScript `enum`.
 *
 * Why:
 *  - Babel/Metro safe: React Native transpiles each file in isolation; `const enum`
 *    is broken under `isolatedModules` and plain `enum` has interop sharp edges.
 *    `as const` objects are plain JS with zero transpile risk.
 *  - JSON-serializable for MMKV saves: values are plain strings, so persisted state
 *    is self-describing and stable across app versions (see save-migration NFR §14.7).
 */

/** Card lifecycle type. `SingleUse` exhausts after one play; `Permanent` recycles. (§7.1) */
export const CardType = {
  SingleUse: 'SingleUse',
  Permanent: 'Permanent',
} as const;
export type CardType = (typeof CardType)[keyof typeof CardType];

/** Gameplay category of a card. (§7.1, §10.3) */
export const CardCategory = {
  Attack: 'Attack',
  Control: 'Control',
  Stats: 'Stats',
  DeckManipulation: 'DeckManipulation',
  Special: 'Special',
} as const;
export type CardCategory = (typeof CardCategory)[keyof typeof CardCategory];

/**
 * Kind of a single card effect. Deliberately tiny and generalized: an effect either
 * changes an entity's statuses (`ApplyStatus` — every buff/debuff, including one-time
 * Damage) or manipulates the deck (`DeckManipulation`). Magnitudes live in `Effect.value`.
 */
export const EffectKind = {
  ApplyStatus: 'ApplyStatus',
  DeckManipulation: 'DeckManipulation',
} as const;
export type EffectKind = (typeof EffectKind)[keyof typeof EffectKind];

/**
 * Who an effect lands on: the caster (`Self`) or the targets the engine selected
 * (`Targets`). Single-vs-multiple targeting is the caller's choice of how many targets
 * it passes, not encoded here.
 */
export const TargetType = {
  Self: 'Self',
  Targets: 'Targets',
} as const;
export type TargetType = (typeof TargetType)[keyof typeof TargetType];

/** Deck-level operation for a `DeckManipulation` effect. */
export const DeckOp = {
  Draw: 'Draw',
  Reshuffle: 'Reshuffle',
} as const;
export type DeckOp = (typeof DeckOp)[keyof typeof DeckOp];

/** Card rarity. `Boss` cards drop only after the root (end) boss. (§7.1) */
export const Rarity = {
  Common: 'Common',
  Uncommon: 'Uncommon',
  Rare: 'Rare',
  Boss: 'Boss',
} as const;
export type Rarity = (typeof Rarity)[keyof typeof Rarity];

/** Type of a level-graph node. (§7.4) */
export const NodeType = {
  Combat: 'Combat',
  Boss: 'Boss',
  Loot: 'Loot',
  Question: 'Question',
  Start: 'Start',
  End: 'End',
  Idle: 'Idle',
} as const;
export type NodeType = (typeof NodeType)[keyof typeof NodeType];

/** Phase of the combat state machine. (§7.5, §8.2) */
export const CombatPhase = {
  PlayerTurn: 'PlayerTurn',
  EnemyTurn: 'EnemyTurn',
  Victory: 'Victory',
  Defeat: 'Defeat',
} as const;
export type CombatPhase = (typeof CombatPhase)[keyof typeof CombatPhase];
