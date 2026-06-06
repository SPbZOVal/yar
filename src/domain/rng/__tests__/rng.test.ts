import { createRng, shuffle } from '../rng';

describe('createRng', () => {
  it('produces floats in [0, 1)', () => {
    const rng = createRng('seed-a');
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic: same seed yields the same sequence', () => {
    const a = createRng('determinism');
    const b = createRng('determinism');
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('differs across seeds', () => {
    const a = Array.from({ length: 20 }, (_, i) => createRng(`seed-${i}`).next());
    // Astronomically unlikely for 20 distinct seeds to collide on the first draw.
    expect(new Set(a).size).toBe(a.length);
  });

  describe('nextInt', () => {
    it('stays within [0, maxExclusive)', () => {
      const rng = createRng('bounds');
      for (let i = 0; i < 1000; i++) {
        const v = rng.nextInt(7);
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(7);
      }
    });

    it('returns 0 for non-positive bounds', () => {
      const rng = createRng('zero');
      expect(rng.nextInt(0)).toBe(0);
      expect(rng.nextInt(-5)).toBe(0);
    });
  });
});

describe('shuffle', () => {
  const deck = Array.from({ length: 12 }, (_, i) => i);

  it('returns a permutation (same multiset, same length)', () => {
    const out = shuffle(deck, 'perm');
    expect(out).toHaveLength(deck.length);
    expect([...out].sort((x, y) => x - y)).toEqual(deck);
  });

  it('does not mutate the input', () => {
    const input = deck.slice();
    shuffle(input, 'no-mutate');
    expect(input).toEqual(deck);
  });

  it('is deterministic: same seed yields the same order', () => {
    expect(shuffle(deck, 'same')).toEqual(shuffle(deck, 'same'));
  });

  it('produces a different order for a different seed', () => {
    expect(shuffle(deck, 'order-a')).not.toEqual(shuffle(deck, 'order-b'));
  });

  it('handles empty and single-element arrays', () => {
    expect(shuffle([], 's')).toEqual([]);
    expect(shuffle([42], 's')).toEqual([42]);
  });
});
