/**
 * Starter deck — the card ids every new run begins its {@link Collection} with.
 *
 * Pure data, no logic: `StartRun` seeds the collection from this list (via `RunDeps`,
 * same way `maxDeckSize`/`generationParams` are injected), then the player picks
 * `maxDeckSize` of them with `BuildDeck`. More than `maxDeckSize` ids so the very first
 * deck-build is a real choice. Each id must resolve in `content/cards` (asserted by a
 * test); the run reducer turns these into owned `CardInstance`s.
 */
export const STARTER_DECK: readonly string[] = [
  'strike',
  'strike',
  'defend',
  'defend',
  'cleave',
  'poison-dart',
] satisfies readonly string[];
