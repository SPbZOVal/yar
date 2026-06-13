/**
 * Tiny functional combinators for composing pure transforms.
 *
 * The domain is full of endomorphisms — `EntityOp = (Entity) => Entity`,
 * state-ops `(CombatState) => CombatState`. Such same-type transforms form a monoid
 * under composition with {@link identity} as the unit; `pipe`/`flow` name that
 * composition instead of hand-rolling `reduce` at each call site.
 */

/** The identity transform — the unit of `pipe`/`flow`. */
export const identity = <A>(a: A): A => a;

/** Apply a sequence of same-type transforms to `value`, left to right. */
export function pipe<A>(value: A, ...fns: ReadonlyArray<(a: A) => A>): A {
  return fns.reduce((acc, f) => f(acc), value);
}

/** Compose same-type transforms into one, applied left to right. `flow()` === identity. */
export function flow<A>(...fns: ReadonlyArray<(a: A) => A>): (a: A) => A {
  return (a) => fns.reduce((acc, f) => f(acc), a);
}
