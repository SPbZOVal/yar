/**
 * Card content — pure data, no logic. Adding a card is appending one entry here; the
 * `satisfies readonly CardDefinition[]` validates every `status`/`op`/`target` against
 * the model unions at compile time, so a typo'd kind fails the build.
 */
import {
  CardCategory,
  CardType,
  DeckOp,
  Lifetime,
  Rarity,
  StatusKind,
  Targeting,
  TargetType,
} from '../model';
import type { CardDefinition } from '../model';

export const CARDS = [
  {
    id: 'strike',
    name: 'Strike',
    description: 'Deal 6 damage.',
    type: CardType.Permanent,
    category: CardCategory.Attack,
    cost: 1,
    rarity: Rarity.Common,
    targeting: Targeting.One,
    isSpecial: false,
    effects: [
      {
        kind: 'ApplyStatus',
        value: 6,
        target: TargetType.Targets,
        status: StatusKind.Damage,
        lifetime: Lifetime.Instant,
      },
    ],
  },
  {
    id: 'defend',
    name: 'Defend',
    description: 'Gain 5 Block.',
    type: CardType.Permanent,
    category: CardCategory.Stats,
    cost: 1,
    rarity: Rarity.Common,
    targeting: Targeting.One,
    isSpecial: false,
    effects: [
      {
        kind: 'ApplyStatus',
        value: 5,
        target: TargetType.Self,
        status: StatusKind.Block,
        lifetime: Lifetime.Fight,
      },
    ],
  },
  {
    id: 'cleave',
    name: 'Cleave',
    description: 'Deal 4 damage to all enemies.',
    type: CardType.Permanent,
    category: CardCategory.Attack,
    cost: 1,
    rarity: Rarity.Common,
    targeting: Targeting.All,
    isSpecial: false,
    effects: [
      {
        kind: 'ApplyStatus',
        value: 4,
        target: TargetType.Targets,
        status: StatusKind.Damage,
        lifetime: Lifetime.Instant,
      },
    ],
  },
  {
    id: 'poison-dart',
    name: 'Poison Dart',
    description: 'Apply 3 Poison.',
    type: CardType.Permanent,
    category: CardCategory.Control,
    cost: 1,
    rarity: Rarity.Uncommon,
    targeting: Targeting.One,
    isSpecial: false,
    effects: [
      {
        kind: 'ApplyStatus',
        value: 3,
        target: TargetType.Targets,
        status: StatusKind.Poison,
        lifetime: Lifetime.Fight,
        duration: 3,
      },
    ],
  },
  {
    id: 'foresight',
    name: 'Foresight',
    description: 'Draw 2 cards.',
    type: CardType.Permanent,
    category: CardCategory.DeckManipulation,
    cost: 1,
    rarity: Rarity.Uncommon,
    targeting: Targeting.One,
    isSpecial: false,
    effects: [{ kind: 'DeckManipulation', op: DeckOp.Draw, value: 2 }],
  },
  {
    // Interactive scry: reveal the top 3 and let the player choose which to draw (see DeckOp.Scry).
    id: 'scout',
    name: 'Scout',
    description: 'Look at the top 3 cards; take any into your hand, discard the rest.',
    type: CardType.Permanent,
    category: CardCategory.DeckManipulation,
    cost: 1,
    rarity: Rarity.Uncommon,
    targeting: Targeting.One,
    isSpecial: false,
    effects: [{ kind: 'DeckManipulation', op: DeckOp.Scry, value: 3 }],
  },
  {
    // Special "+heart": collected after the end boss, applied to player meta (not a deck card).
    id: 'heart',
    name: 'Heart',
    description: 'Gain +5 max HP (and heal that much).',
    type: CardType.SingleUse,
    category: CardCategory.Special,
    cost: 0,
    rarity: Rarity.Boss,
    targeting: Targeting.One,
    isSpecial: true,
    effects: [
      {
        kind: 'ApplyStatus',
        value: 5, // = BALANCE_CONSTANTS.specialHeartBonus
        target: TargetType.Self,
        status: StatusKind.MaxHpUp,
        lifetime: Lifetime.Permanent,
      },
    ],
  },
  {
    // Special "upgrade weapon": steps the equipped weapon up one tier on collection.
    id: 'whetstone',
    name: 'Whetstone',
    description: 'Upgrade your weapon by one tier.',
    type: CardType.SingleUse,
    category: CardCategory.Special,
    cost: 0,
    rarity: Rarity.Boss,
    targeting: Targeting.One,
    isSpecial: true,
    effects: [
      {
        kind: 'ApplyStatus',
        value: 1,
        target: TargetType.Self,
        status: StatusKind.WeaponTier,
        lifetime: Lifetime.Life,
      },
    ],
  },
] satisfies readonly CardDefinition[];
