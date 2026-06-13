/**
 * Enemy content — pure data, no logic. Intents are a fixed, telegraphed cycle (no
 * RNG); `kind` is the intent's effect tag the combat reducer interprets. Adding an
 * enemy is appending one entry; `satisfies readonly EnemyDefinition[]` validates it.
 */
import type { EnemyDefinition } from '../model';

export const ENEMIES = [
  {
    id: 'bat',
    name: 'Bat',
    maxHp: 6,
    isBoss: false,
    intents: [{ kind: 'attack', value: 2 }],
  },
  {
    id: 'slime',
    name: 'Slime',
    maxHp: 8,
    isBoss: false,
    intents: [{ kind: 'attack', value: 3 }],
  },
  {
    id: 'goblin',
    name: 'Goblin',
    maxHp: 12,
    isBoss: false,
    intents: [
      { kind: 'attack', value: 5 },
      { kind: 'block', value: 4 },
    ],
  },
  {
    id: 'brute',
    name: 'Brute',
    maxHp: 18,
    isBoss: false,
    intents: [
      { kind: 'attack', value: 7 },
      { kind: 'block', value: 5 },
    ],
  },
  {
    id: 'ogre',
    name: 'Ogre',
    maxHp: 26,
    isBoss: false,
    intents: [
      { kind: 'attack', value: 10 },
      { kind: 'block', value: 6 },
    ],
  },
  {
    id: 'warden',
    name: 'Warden',
    maxHp: 40,
    isBoss: true,
    intents: [
      { kind: 'attack', value: 8 },
      { kind: 'attack', value: 12 },
    ],
  },
  {
    id: 'overlord',
    name: 'Overlord',
    maxHp: 60,
    isBoss: true,
    intents: [
      { kind: 'attack', value: 10 },
      { kind: 'block', value: 8 },
      { kind: 'attack', value: 14 },
    ],
  },
] satisfies readonly EnemyDefinition[];
