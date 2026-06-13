import { flow, identity, pipe } from '../fn';

const inc = (n: number): number => n + 1;
const double = (n: number): number => n * 2;

describe('identity', () => {
  it('returns its argument unchanged', () => {
    expect(identity(7)).toBe(7);
    const obj = { a: 1 };
    expect(identity(obj)).toBe(obj);
  });
});

describe('pipe', () => {
  it('applies transforms left to right', () => {
    expect(pipe(3, inc, double)).toBe(8); // (3 + 1) * 2
  });

  it('returns the value unchanged with no transforms', () => {
    expect(pipe(5)).toBe(5);
  });
});

describe('flow', () => {
  it('composes transforms into one, applied left to right', () => {
    expect(flow(inc, double)(3)).toBe(8);
  });

  it('flow() is identity', () => {
    expect(flow<number>()(5)).toBe(5);
  });
});
