/**
 * Persistence types — the contract the store + MMKV layer share.
 *
 * Only the meta-progression survives a run: the {@link Collection} (unlocked cards/equipment)
 * and {@link Settings}. The active run/combat are intentionally ephemeral (docs §6.2), so they
 * are never persisted. A single JSON {@link SaveSnapshot} is stored under one key; `schemaVersion`
 * drives forward migrations (docs §14.7).
 */
import type { Collection } from '../domain/model';

/**
 * Minimal key-value backend the persistence service needs. Matches the surface of
 * `react-native-mmkv` (and a trivial in-memory map), so the service is storage-agnostic and
 * unit-testable without the native module.
 */
export interface KeyValueStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

/** Player-facing settings (persisted across runs). */
export interface Settings {
  readonly soundEnabled: boolean;
  readonly language: 'ru' | 'en';
  readonly difficulty: 'normal' | 'hard';
}

export const DEFAULT_SETTINGS: Settings = {
  soundEnabled: true,
  language: 'ru',
  difficulty: 'normal',
};

/** Current on-disk save schema version. Bump + add a migration when the shape changes. */
export const SCHEMA_VERSION = 1;

/** The persisted snapshot: meta-progression only. */
export interface SaveSnapshot {
  readonly schemaVersion: number;
  readonly collection: Collection;
  readonly settings: Settings;
}
