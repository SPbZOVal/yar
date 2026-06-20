/**
 * In-memory {@link KeyValueStore} — a Map-backed store for tests and any non-RN host (e.g. a
 * future web build). The MMKV-backed store ({@link ./mmkvStore}) is the production native impl.
 */
import type { KeyValueStore } from './types';

export class InMemoryKeyValueStore implements KeyValueStore {
  private readonly map = new Map<string, string>();

  getString(key: string): string | undefined {
    return this.map.get(key);
  }

  set(key: string, value: string): void {
    this.map.set(key, value);
  }

  delete(key: string): void {
    this.map.delete(key);
  }
}
