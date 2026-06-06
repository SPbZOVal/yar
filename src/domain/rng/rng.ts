/**
 * Deterministic, seedable pseudo-random number generator.
 *
 * Determinism by `seed` is a core non-functional requirement (§13.1): the same
 * seed must reproduce the same level, shuffle, and loot. We therefore never use
 * `Math.random()` anywhere in the domain — all randomness flows through here.
 *
 * Implementation: `cyrb128` hashes a string seed into four 32-bit integers, the
 * first of which seeds `mulberry32`, a tiny, well-known 32-bit PRNG. Both are pure
 * integer arithmetic (`Math.imul`, bit ops), so the output is identical across
 * Node/V8 versions and safe under Babel/Metro (no platform RNG dependency).
 */

/** A seeded random source. */
export interface Rng {
  /** Next float in [0, 1). */
  next(): number;
  /** Next integer in [0, maxExclusive). Returns 0 when `maxExclusive <= 0`. */
  nextInt(maxExclusive: number): number;
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

/** mulberry32 PRNG: 32-bit state -> float in [0, 1). */
function mulberry32(seedState: number): () => number {
  let a = seedState >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Create a deterministic {@link Rng} from a string seed. */
export function createRng(seed: string): Rng {
  const [s0] = cyrb128(seed);
  const next = mulberry32(s0);
  return {
    next,
    nextInt(maxExclusive: number): number {
      if (maxExclusive <= 0) return 0;
      return Math.floor(next() * maxExclusive);
    },
  };
}

/**
 * Return a new array with the elements of `items` shuffled deterministically by
 * `seed` (Fisher–Yates). The input is never mutated.
 */
export function shuffle<T>(items: readonly T[], seed: string): T[] {
  const rng = createRng(seed);
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}
