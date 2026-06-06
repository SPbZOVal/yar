/** Card data model. See docs/architecture/03-data-model.md §7.1. */
import type { CardCategory, CardType, EffectKind, Rarity, TargetType } from './enums';

/**
 * A single effect of a card. Damage / block / temp-HP magnitudes are read from
 * `value` for the matching `kind` (there is no separate damage field). See §12.2.
 */
export interface Effect {
  readonly kind: EffectKind;
  readonly value: number;
  readonly target: TargetType;
  /** Status identifier, only meaningful when `kind === ApplyStatus`. */
  readonly statusId?: string;
  /** Duration in turns, only meaningful for status/temporary effects. */
  readonly duration?: number;
}

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
