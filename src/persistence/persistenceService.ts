/**
 * PersistenceService — pure save/load over a {@link KeyValueStore}, with forward migrations.
 *
 * The whole save is one JSON blob under {@link SAVE_KEY}. `load` parses, migrates an older
 * `schemaVersion` up to {@link SCHEMA_VERSION}, and validates the shape — returning `null` for a
 * missing, corrupt, or unmigratable save (the caller then starts fresh). `save` serializes a
 * snapshot. No native imports here, so this is fully unit-testable in node.
 */
import type { Armor, CardInstance, Collection, Weapon } from '../domain/model';
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from './types';
import type { KeyValueStore, SaveSnapshot, Settings } from './types';

export const SAVE_KEY = 'yar.save';

/** Migration from version N to N+1; keyed by the source version. */
type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/** Versioned migrations. Empty while v1 is current; add `[1]: …` when bumping to v2. */
const MIGRATIONS: Readonly<Record<number, Migration>> = {};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isString = (v: unknown): v is string => typeof v === 'string';
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';

/** Persist a snapshot (one JSON blob). */
export function saveSnapshot(kv: KeyValueStore, snapshot: SaveSnapshot): void {
  kv.set(SAVE_KEY, JSON.stringify(snapshot));
}

/** Parse a stored card instance, or `null` if malformed. */
function readCardInstance(v: unknown): CardInstance | null {
  if (!isRecord(v) || !isString(v.instanceId) || !isString(v.defId)) return null;
  return { instanceId: v.instanceId, defId: v.defId, upgraded: v.upgraded === true };
}

/** Parse an array via a per-item reader; returns `null` if the value isn't an array or any item fails. */
function readArray<T>(v: unknown, read: (item: unknown) => T | null): readonly T[] | null {
  if (!Array.isArray(v)) return null;
  const out: T[] = [];
  for (const item of v) {
    const parsed = read(item);
    if (parsed === null) return null;
    out.push(parsed);
  }
  return out;
}

function readWeapon(v: unknown): Weapon | null {
  if (!isRecord(v) || !isString(v.id) || !isString(v.name)) return null;
  if (typeof v.attackBonus !== 'number' || typeof v.tier !== 'number') return null;
  return { id: v.id, name: v.name, attackBonus: v.attackBonus, tier: v.tier };
}

function readArmor(v: unknown): Armor | null {
  if (!isRecord(v) || !isString(v.id) || !isString(v.name)) return null;
  if (typeof v.maxHpBonus !== 'number' || typeof v.blockBonus !== 'number') return null;
  if (typeof v.tier !== 'number') return null;
  return {
    id: v.id,
    name: v.name,
    maxHpBonus: v.maxHpBonus,
    blockBonus: v.blockBonus,
    tier: v.tier,
  };
}

/** Validate a stored collection; `null` if any pile is missing or malformed. */
function readCollection(v: unknown): Collection | null {
  if (!isRecord(v)) return null;
  const ownedCards = readArray(v.ownedCards, readCardInstance);
  const ownedWeapons = readArray(v.ownedWeapons, readWeapon);
  const ownedArmor = readArray(v.ownedArmor, readArmor);
  if (ownedCards === null || ownedWeapons === null || ownedArmor === null) return null;
  return { ownedCards, ownedWeapons, ownedArmor };
}

/** Read settings tolerantly: unknown/missing fields fall back to defaults. */
function readSettings(v: unknown): Settings {
  if (!isRecord(v)) return DEFAULT_SETTINGS;
  return {
    soundEnabled: isBool(v.soundEnabled) ? v.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
    language: v.language === 'en' || v.language === 'ru' ? v.language : DEFAULT_SETTINGS.language,
    difficulty:
      v.difficulty === 'hard' || v.difficulty === 'normal'
        ? v.difficulty
        : DEFAULT_SETTINGS.difficulty,
  };
}

/** Run forward migrations from the blob's version up to current; `null` if a step is missing. */
function migrate(raw: Record<string, unknown>): Record<string, unknown> | null {
  let data = raw;
  let version = typeof data.schemaVersion === 'number' ? data.schemaVersion : 0;
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (step === undefined) return null; // unknown/too-old version → treat as no save
    data = step(data);
    version += 1;
  }
  return data;
}

/** Load + migrate + validate a snapshot; `null` for missing/corrupt/unmigratable saves. */
export function loadSnapshot(kv: KeyValueStore): SaveSnapshot | null {
  const raw = kv.getString(SAVE_KEY);
  if (raw === undefined) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  const migrated = migrate(parsed);
  if (migrated === null) return null;
  const collection = readCollection(migrated.collection);
  if (collection === null) return null;
  return { schemaVersion: SCHEMA_VERSION, collection, settings: readSettings(migrated.settings) };
}
