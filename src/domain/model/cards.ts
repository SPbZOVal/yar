/** Card data model. */
import type { CardCategory, CardType, DeckOp, Rarity, Targeting, TargetType } from './enums';
import type { Lifetime, StatusKind } from './status';

/**
 * Apply `value` stacks of a `status` (with its `lifetime`) to the recipient(s).
 * This covers every entity effect: a Block shield, a Poison, an AttackUp buff, a
 * "+heart" MaxHpUp — and one-time damage (`status: 'Damage'`, `lifetime: 'instant'`),
 * whose magnitude is read from `value` and scaled by the source's attack power.
 */
export interface ApplyStatusEffect {
  readonly kind: 'ApplyStatus';
  readonly value: number;
  readonly target: TargetType;
  readonly status: StatusKind;
  readonly lifetime: Lifetime;
  /** Turn-decay duration, only meaningful for stored statuses (e.g. Poison). */
  readonly duration?: number;
}

/** Operate on the deck piles (draw `value` cards, reshuffle the discard, …). */
export interface DeckManipulationEffect {
  readonly kind: 'DeckManipulation';
  readonly op: DeckOp;
  readonly value: number;
}

/**
 * A single card effect, as a discriminated union on `kind`. Magnitudes live in
 * `value` (status stacks / damage / cards drawn) — there is no separate field.
 */
export type Effect = ApplyStatusEffect | DeckManipulationEffect;

/**
 * Immutable template of a card. Shared by every instance with the same `id`.
 * Content is data-only: adding a card means adding a definition, not engine code (§13.1).
 */
export interface CardDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly type: CardType;
  readonly category: CardCategory;
  readonly cost: number;
  readonly effects: readonly Effect[];
  readonly rarity: Rarity;
  /** Whether enemy-directed effects hit one chosen enemy (`One`) or all of them (`All`, cleave). */
  readonly targeting: Targeting;
  /** Special cards (e.g. "+heart", "upgrade weapon") drop only after the end boss. */
  readonly isSpecial: boolean;
}

/**
 * A run-time instance of a card. References a {@link CardDefinition} by `defId`;
 * `instanceId` is the unique identity used to move the card between combat piles.
 */
export interface CardInstance {
  readonly instanceId: string;
  readonly defId: string;
  readonly upgraded: boolean;
}
