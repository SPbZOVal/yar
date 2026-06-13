/**
 * Card registry — resolve a `defId` to its {@link CardDefinition}.
 *
 * Built from the `content/cards` data, this replaces the ad-hoc `getDef` closure that
 * the resolver / deck / combat reducer used to thread by hand.
 */
import type { CardDefinition } from '../model';
import { CARDS } from '../content/cards';

export const CARD_DEFS: ReadonlyMap<string, CardDefinition> = new Map(
  CARDS.map((card) => [card.id, card]),
);

/** Resolve a card `defId`; throws on an unknown id (a content bug, never user input). */
export function getCardDef(defId: string): CardDefinition {
  const def = CARD_DEFS.get(defId);
  if (def === undefined) throw new Error(`Unknown card def: ${defId}`);
  return def;
}
