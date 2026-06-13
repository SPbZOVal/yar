import { CardCategory, CardType, Rarity } from '../../../model';
import type { CardDefinition } from '../../../model';
import { seedFrom } from '../../../rng/rng';
import { rollBossLoot, rollChestLoot, rollQuestion } from '../lootSystem';
import type { LootDeps, QuestionDeps, QuestionTemplate } from '../lootSystem';

// --- Fixtures -------------------------------------------------------------

function card(
  id: string,
  rarity: Rarity,
  opts: { type?: CardType; isSpecial?: boolean } = {},
): CardDefinition {
  return {
    id,
    name: id,
    description: '',
    type: opts.type ?? CardType.Permanent,
    category: CardCategory.Attack,
    cost: 1,
    effects: [],
    rarity,
    isSpecial: opts.isSpecial ?? false,
  };
}

const POOL: readonly CardDefinition[] = [
  card('c1', Rarity.Common),
  card('c2', Rarity.Common),
  card('u1', Rarity.Uncommon),
  card('r1', Rarity.Rare),
  card('boss1', Rarity.Boss),
  card('heart', Rarity.Rare, { isSpecial: true }),
];

const deps: LootDeps = {
  cardPool: POOL,
  rarityWeights: { Common: 60, Uncommon: 30, Rare: 10, Boss: 0 },
  bossRarityWeights: { Common: 0, Uncommon: 0, Rare: 0, Boss: 100 },
};

const qDeps: QuestionDeps = {
  ...deps,
  questionPool: [
    { text: 'Q1', options: ['a', 'b'], correctIndex: 0 },
    { text: 'Q2', options: ['c', 'd'], correctIndex: 1 },
  ],
};

const only = (reward: { cards: readonly CardDefinition[] }): CardDefinition | undefined =>
  reward.cards[0];

// --- rollChestLoot --------------------------------------------------------

describe('rollChestLoot', () => {
  it('is deterministic: same seed ⇒ identical reward and advanced seed', () => {
    const a = rollChestLoot(deps, seedFrom('x'));
    const b = rollChestLoot(deps, seedFrom('x'));
    expect(a).toEqual(b);
  });

  it('actually varies across seeds', () => {
    const ids = new Set(
      Array.from({ length: 40 }, (_, i) => only(rollChestLoot(deps, seedFrom(`s${i}`))[0])?.id),
    );
    expect(ids.size).toBeGreaterThan(1);
  });

  it('never yields a special or Boss-rarity card, and is not special', () => {
    for (let i = 0; i < 100; i++) {
      const [reward] = rollChestLoot(deps, seedFrom(`chest${i}`));
      expect(reward.isSpecial).toBe(false);
      const c = only(reward);
      expect(c?.isSpecial ?? false).toBe(false);
      expect(c?.rarity).not.toBe(Rarity.Boss);
    }
  });

  it('does not mutate the injected pool', () => {
    const snapshot = POOL.map((c) => c.id);
    rollChestLoot(deps, seedFrom('m'));
    expect(POOL.map((c) => c.id)).toEqual(snapshot);
  });
});

// --- rollBossLoot ---------------------------------------------------------

describe('rollBossLoot', () => {
  it('end boss may drop a Boss/special card and flags the reward special', () => {
    const [reward] = rollBossLoot(deps, seedFrom('end'), true);
    expect(reward.isSpecial).toBe(true);
    expect(only(reward)?.rarity).toBe(Rarity.Boss); // weights force Boss, pool has boss1
  });

  it('mid boss never yields a special / Boss-rarity card and is not special (falls back)', () => {
    for (let i = 0; i < 50; i++) {
      const [reward] = rollBossLoot(deps, seedFrom(`mid${i}`), false);
      expect(reward.isSpecial).toBe(false);
      const c = only(reward);
      expect(c?.isSpecial ?? false).toBe(false);
      expect(c?.rarity).not.toBe(Rarity.Boss); // Boss bucket excluded ⇒ falls back to Rare (r1)
      expect(c?.id).toBe('r1');
    }
  });
});

// --- empty-bucket fallback ------------------------------------------------

describe('rarity fallback', () => {
  it('falls back to the nearest lower rarity when the rolled bucket is empty', () => {
    const commonsOnly: LootDeps = {
      cardPool: [card('c1', Rarity.Common), card('c2', Rarity.Common)],
      rarityWeights: { Common: 0, Uncommon: 0, Rare: 100, Boss: 0 }, // forces Rare → empty → Common
      bossRarityWeights: deps.bossRarityWeights,
    };
    const [reward] = rollChestLoot(commonsOnly, seedFrom('fallback'));
    expect(only(reward)?.rarity).toBe(Rarity.Common);
  });

  it('yields no card when no bucket at any tier matches', () => {
    const empty: LootDeps = { ...deps, cardPool: [] };
    const [reward] = rollChestLoot(empty, seedFrom('none'));
    expect(reward.cards).toEqual([]);
  });
});

// --- rollQuestion ---------------------------------------------------------

describe('rollQuestion', () => {
  it('is deterministic and attaches a rolled reward to a pooled prompt', () => {
    const [q, seed] = rollQuestion(qDeps, seedFrom('q'));
    const [q2, seed2] = rollQuestion(qDeps, seedFrom('q'));
    expect(q).toEqual(q2);
    expect(seed).toBe(seed2);
    expect(['Q1', 'Q2']).toContain(q.text);
    expect(q.rewardOnCorrect).toBeDefined();
    expect(q.rewardOnCorrect.isSpecial).toBe(false);
  });

  it('falls back to an empty prompt when the question pool is empty', () => {
    const emptyQ: QuestionDeps = { ...qDeps, questionPool: [] as readonly QuestionTemplate[] };
    const [q] = rollQuestion(emptyQ, seedFrom('q'));
    expect(q.text).toBe('');
    expect(q.rewardOnCorrect).toBeDefined();
  });
});
