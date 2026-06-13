import { Rand, seedFrom, step } from '../rng';
import type { Seed } from '../rng';

const seed = (s: string): Seed => seedFrom(s);

describe('step', () => {
  it('produces floats in [0, 1)', () => {
    let s = seed('floats');
    for (let i = 0; i < 1000; i++) {
      const [v, next] = step(s);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      s = next;
    }
  });

  it('is pure: the same seed yields the same [value, next]', () => {
    const s = seed('pure');
    expect(step(s)).toEqual(step(s));
  });

  it('advances: stepping the returned seed continues the sequence', () => {
    const [, s1] = step(seed('advance'));
    const [, s2] = step(s1);
    expect(s1).not.toBe(s2);
  });
});

describe('seedFrom', () => {
  it('is deterministic and differs across strings', () => {
    expect(seedFrom('x')).toBe(seedFrom('x'));
    expect(seedFrom('x')).not.toBe(seedFrom('y'));
  });
});

describe('Rand.nextInt', () => {
  it('stays within [0, maxExclusive)', () => {
    let s = seed('bounds');
    for (let i = 0; i < 1000; i++) {
      const [v, next] = Rand.nextInt(7)(s);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
      s = next;
    }
  });

  it('returns 0 without advancing for non-positive bounds', () => {
    const s = seed('zero');
    expect(Rand.nextInt(0)(s)).toEqual([0, s]);
    expect(Rand.nextInt(-5)(s)).toEqual([0, s]);
  });
});

describe('Rand.shuffle', () => {
  const deck = Array.from({ length: 12 }, (_, i) => i);

  it('returns a permutation (same multiset, same length)', () => {
    const [out] = Rand.shuffle(deck)(seed('perm'));
    expect(out).toHaveLength(deck.length);
    expect([...out].sort((x, y) => x - y)).toEqual(deck);
  });

  it('does not mutate the input', () => {
    const input = deck.slice();
    Rand.shuffle(input)(seed('no-mutate'));
    expect(input).toEqual(deck);
  });

  it('is deterministic for a given seed and differs across seeds', () => {
    expect(Rand.shuffle(deck)(seed('same'))).toEqual(Rand.shuffle(deck)(seed('same')));
    expect(Rand.shuffle(deck)(seed('a'))[0]).not.toEqual(Rand.shuffle(deck)(seed('b'))[0]);
  });

  it('handles empty and single-element arrays', () => {
    expect(Rand.shuffle([])(seed('s'))[0]).toEqual([]);
    expect(Rand.shuffle([42])(seed('s'))[0]).toEqual([42]);
  });
});

describe('Rand monad ops', () => {
  it('of injects a value without consuming the seed', () => {
    const s = seed('of');
    expect(Rand.of(7)(s)).toEqual([7, s]);
  });

  it('map transforms the value and threads the advanced seed', () => {
    const s = seed('map');
    const [doubled, after] = Rand.map(Rand.nextInt(10), (n) => n * 2)(s);
    const [raw, afterRaw] = Rand.nextInt(10)(s);
    expect(doubled).toBe(raw * 2);
    expect(after).toBe(afterRaw);
  });

  it('chain sequences two computations, threading the seed', () => {
    const s = seed('chain');
    const twoInts = Rand.chain(Rand.nextInt(100), (a) =>
      Rand.map(Rand.nextInt(100), (b) => [a, b] as const),
    );
    const [[a, b], after] = Rand.run(twoInts, s);
    // Same as drawing them by hand, sequentially.
    const [a2, s1] = Rand.nextInt(100)(s);
    const [b2, s2] = Rand.nextInt(100)(s1);
    expect([a, b]).toEqual([a2, b2]);
    expect(after).toBe(s2);
  });
});
