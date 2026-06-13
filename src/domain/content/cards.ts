/**
 * Card content — pure data, no logic. Adding a card is appending one entry here; the
 * `satisfies readonly CardDefinition[]` validates every `status`/`op`/`target` against
 * the model unions at compile time, so a typo'd kind fails the build.
 */
import { CardCategory, CardType, DeckOp, Lifetime, Rarity, StatusKind, TargetType } from '../model';
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
    description: 'Deal 4 damage to all targets.',
    type: CardType.Permanent,
    category: CardCategory.Attack,
    cost: 1,
    rarity: Rarity.Common,
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
    isSpecial: false,
    effects: [{ kind: 'DeckManipulation', op: DeckOp.Draw, value: 2 }],
  },
] satisfies readonly CardDefinition[];
