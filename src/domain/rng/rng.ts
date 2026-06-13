/**
 * Deterministic, seedable randomness — the only source of randomness in the domain
 * (we never use `Math.random()`).
 *
 * Randomness is expressed as the {@link Rand} monad: a `Rand<A>` threads an immutable
 * {@link Seed} and yields an `A` plus the advanced seed, so a whole computation is
 * reproducible from its starting seed and randomness composes without inventing
 * per-call seeds. The seed is a single 32-bit integer (`mulberry32` state); `cyrb128`
 * hashes a string into one. All integer arithmetic (`Math.imul`, bit ops), so output
 * is identical across Node/V8 and safe under Babel/Metro.
 */

/**
 * Immutable RNG state: a single 32-bit integer (the mulberry32 cursor), threaded by
 * value so a randomness-consuming computation is reproducible from its starting seed.
 */
export type Seed = number;

/**
 * One pure mulberry32 advance: from a `Seed`, produce a float in [0, 1) and the next
 * `Seed`. The single primitive every other randomness helper is built on.
 */
export function step(seed: Seed): readonly [number, Seed] {
  const a = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, a];
}

/** Derive an initial {@link Seed} from a string (cyrb128's first word). */
export function seedFrom(seed: string): Seed {
  return cyrb128(seed)[0];
}

/** Hash an arbitrary string seed into four 32-bit seed integers (cyrb128). */
function cyrb128(seed: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < seed.length; i++) {
    const k = seed.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

/**
 * A `Rand<A>` is a deterministic computation that consumes RNG state and yields an
 * `A` plus the advanced `Seed` — the seeded-State monad. Compose with `map`/`chain`
 * and execute with `Rand.run(ra, seed)`.
 */
export type Rand<A> = (seed: Seed) => readonly [A, Seed];

const randOf =
  <A>(a: A): Rand<A> =>
  (seed) => [a, seed];

const randMap =
  <A, B>(ra: Rand<A>, f: (a: A) => B): Rand<B> =>
  (seed) => {
    const [a, next] = ra(seed);
    return [f(a), next];
  };

const randChain =
  <A, B>(ra: Rand<A>, f: (a: A) => Rand<B>): Rand<B> =>
  (seed) => {
    const [a, next] = ra(seed);
    return f(a)(next);
  };

const randRun = <A>(ra: Rand<A>, seed: Seed): readonly [A, Seed] => ra(seed);

/** Next integer in [0, maxExclusive) as a `Rand`. Yields 0 when `maxExclusive <= 0`. */
const randInt =
  (maxExclusive: number): Rand<number> =>
  (seed) => {
    if (maxExclusive <= 0) return [0, seed];
    const [value, next] = step(seed);
    return [Math.floor(value * maxExclusive), next];
  };

/** Deterministic Fisher–Yates shuffle as a `Rand`. The input is never mutated. */
const randShuffle =
  <T>(items: readonly T[]): Rand<readonly T[]> =>
  (seed) => {
    const out = items.slice();
    let current = seed;
    for (let i = out.length - 1; i > 0; i--) {
      const [j, next] = randInt(i + 1)(current);
      current = next;
      const tmp = out[i] as T;
      out[i] = out[j] as T;
      out[j] = tmp;
    }
    return [out, current];
  };

/** The `Rand` monad toolkit. (`Rand` is also the computation type above.) */
export const Rand = {
  of: randOf,
  map: randMap,
  chain: randChain,
  run: randRun,
  nextInt: randInt,
  shuffle: randShuffle,
} as const;
