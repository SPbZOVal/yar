/**
 * LootSystem — pure, deterministic loot rolls (cards-only for now).
 *
 * Rewards are rolled with the {@link Rand} monad so the same seed always yields the same
 * drop. The card pool and rarity weights are injected (never hardcoded) so content and
 * balance live in `content/` + `RuleSet`, not here. A roll picks a rarity by weight, then
 * a card from that rarity bucket; an empty bucket falls back to the nearest lower rarity.
 *
 * Gating mirrors the model contracts (§7.1, §7.6):
 *  - chests (`rollChestLoot`) never yield `isSpecial` or `Rarity.Boss` cards;
 *  - the end boss (`rollBossLoot(_, _, true)`) may yield both and marks the reward special;
 *  - a mid-boss (`rollBossLoot(_, _, false)`) rolls the richer boss weights but, like a
 *    chest, excludes special / `Boss`-rarity cards and is not special.
 *
 * Single-use vs Permanent is *not* decided here — it is read from `CardDefinition.type`
 * by the run reducer's loot routing.
 */
import { Rarity } from '../../model';
import type { CardDefinition, LootReward, QuestionData } from '../../model';
import { Rand } from '../../rng/rng';
import type { Rand as RandT, Seed } from '../../rng/rng';

/** Rarity tiers, lowest → highest; drives weighted picks and empty-bucket fallback. */
const RARITY_ORDER: readonly Rarity[] = [Rarity.Common, Rarity.Uncommon, Rarity.Rare, Rarity.Boss];

/** Card pool + rarity weights the rollers need. Drawn from content/`RuleSet` in production. */
export interface LootDeps {
  readonly cardPool: readonly CardDefinition[];
  /** Chest weights — `Boss` weight should be 0 so chests never roll Boss-rarity. */
  readonly rarityWeights: Record<Rarity, number>;
  /** Boss-table weights — `Rare`/`Boss`-heavy. */
  readonly bossRarityWeights: Record<Rarity, number>;
}

/** A question prompt without its reward (the reward is rolled at placement time). */
export type QuestionTemplate = Omit<QuestionData, 'rewardOnCorrect'>;

/** {@link LootDeps} plus the question pool, for `rollQuestion`. */
export interface QuestionDeps extends LootDeps {
  readonly questionPool: readonly QuestionTemplate[];
}

/** Weighted pick over the rarity tiers; yields `Common` if every weight is non-positive. */
const rollRarity =
  (weights: Record<Rarity, number>): RandT<Rarity> =>
  (seed) => {
    const total = RARITY_ORDER.reduce((sum, r) => sum + Math.max(0, weights[r]), 0);
    if (total <= 0) return [Rarity.Common, seed];
    const [pick, next] = Rand.nextInt(total)(seed);
    let acc = 0;
    for (const r of RARITY_ORDER) {
      acc += Math.max(0, weights[r]);
      if (pick < acc) return [r, next];
    }
    return [Rarity.Boss, next];
  };

/**
 * Pick a card of `rarity`, falling back to the nearest lower rarity when the bucket is
 * empty. When `allowSpecial` is false, special and `Boss`-rarity cards are excluded.
 * Yields `undefined` only if no card matches at any tier ≤ `rarity`.
 */
const pickCard =
  (
    pool: readonly CardDefinition[],
    rarity: Rarity,
    allowSpecial: boolean,
  ): RandT<CardDefinition | undefined> =>
  (seed) => {
    for (let i = RARITY_ORDER.indexOf(rarity); i >= 0; i--) {
      const tier = RARITY_ORDER[i];
      if (tier === undefined) continue;
      const bucket = pool.filter(
        (c) => c.rarity === tier && (allowSpecial || (!c.isSpecial && c.rarity !== Rarity.Boss)),
      );
      if (bucket.length > 0) {
        const [idx, next] = Rand.nextInt(bucket.length)(seed);
        return [bucket[idx] as CardDefinition, next];
      }
    }
    return [undefined, seed];
  };

/** A reward of a single card rolled from `weights`; `[]` when no card matches. */
const cardReward =
  (
    deps: LootDeps,
    weights: Record<Rarity, number>,
    allowSpecial: boolean,
    isSpecial: boolean,
  ): RandT<LootReward> =>
  (seed) => {
    const [rarity, s1] = rollRarity(weights)(seed);
    const [card, s2] = pickCard(deps.cardPool, rarity, allowSpecial)(s1);
    return [{ cards: card === undefined ? [] : [card], isSpecial }, s2];
  };

/** Roll a chest reward: one non-special, non-Boss card. */
export function rollChestLoot(deps: LootDeps, seed: Seed): readonly [LootReward, Seed] {
  return cardReward(deps, deps.rarityWeights, false, false)(seed);
}

/**
 * Roll a boss reward from the boss weights. The end boss (`isEndBoss`) may drop special /
 * `Boss`-rarity cards and the reward is flagged special; a mid-boss may not, and is not.
 */
export function rollBossLoot(
  deps: LootDeps,
  seed: Seed,
  isEndBoss: boolean,
): readonly [LootReward, Seed] {
  return cardReward(deps, deps.bossRarityWeights, isEndBoss, isEndBoss)(seed);
}

const FALLBACK_QUESTION: QuestionTemplate = { text: '', options: [], correctIndex: 0 };

/** Roll a question: pick a prompt from the pool and attach a chest-style reward. */
export function rollQuestion(deps: QuestionDeps, seed: Seed): readonly [QuestionData, Seed] {
  const [pick, s1] = Rand.nextInt(deps.questionPool.length)(seed);
  const template =
    deps.questionPool.length === 0
      ? FALLBACK_QUESTION
      : (deps.questionPool[pick] as QuestionTemplate);
  const [reward, s2] = cardReward(deps, deps.rarityWeights, false, false)(s1);
  return [{ ...template, rewardOnCorrect: reward }, s2];
}
