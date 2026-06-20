/**
 * Persistence barrel — types, the pure save/load service, the in-memory store, and a small
 * {@link Persistence} facade the store consumes. The MMKV-backed store lives in `./mmkvStore`
 * and is imported ONLY by the app entry, so this barrel (and the test suite) never pull in the
 * native module.
 */
import { loadSnapshot, saveSnapshot } from './persistenceService';
import type { KeyValueStore, SaveSnapshot } from './types';

export type { KeyValueStore, SaveSnapshot, Settings } from './types';
export { DEFAULT_SETTINGS, SCHEMA_VERSION } from './types';
export { loadSnapshot, saveSnapshot, SAVE_KEY } from './persistenceService';
export { InMemoryKeyValueStore } from './inMemoryStore';

/** What the store needs: load the meta snapshot at boot, save it on change. */
export interface Persistence {
  load(): SaveSnapshot | null;
  save(snapshot: SaveSnapshot): void;
}

/** Build a {@link Persistence} facade over any {@link KeyValueStore} (MMKV, in-memory, …). */
export const createPersistence = (kv: KeyValueStore): Persistence => ({
  load: () => loadSnapshot(kv),
  save: (snapshot) => saveSnapshot(kv, snapshot),
});
