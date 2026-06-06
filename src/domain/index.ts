/**
 * Public surface of the pure-TypeScript domain layer.
 *
 * This is the single import point for the future GameStore and UI; the domain has
 * zero React/React-Native dependencies (§02-architecture).
 *
 * Scope so far: the deterministic seeded RNG (the determinism NFR §13.1). The data
 * model, RuleSet, and DeckManager land in follow-up PRs.
 */
export { createRng, shuffle } from './rng/rng';
export type { Rng } from './rng/rng';
