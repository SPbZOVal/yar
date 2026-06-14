import {
  DEFAULT_SETTINGS,
  InMemoryKeyValueStore,
  SAVE_KEY,
  SCHEMA_VERSION,
  createPersistence,
  loadSnapshot,
  saveSnapshot,
} from '..';
import type { SaveSnapshot } from '..';
import type { Collection } from '../../domain/model';

const collection = (): Collection => ({
  ownedCards: [{ instanceId: 'strike#0', defId: 'strike', upgraded: false }],
  ownedWeapons: [{ id: 'sword', name: 'Sword', attackBonus: 4, tier: 2 }],
  ownedArmor: [{ id: 'plate', name: 'Plate', maxHpBonus: 10, blockBonus: 3, tier: 2 }],
});

describe('persistenceService', () => {
  it('round-trips a snapshot', () => {
    const kv = new InMemoryKeyValueStore();
    const snap: SaveSnapshot = {
      schemaVersion: SCHEMA_VERSION,
      collection: collection(),
      settings: { soundEnabled: false, language: 'en', difficulty: 'hard' },
    };
    saveSnapshot(kv, snap);
    expect(loadSnapshot(kv)).toEqual(snap);
  });

  it('returns null for a missing save', () => {
    expect(loadSnapshot(new InMemoryKeyValueStore())).toBeNull();
  });

  it('returns null for corrupt JSON', () => {
    const kv = new InMemoryKeyValueStore();
    kv.set(SAVE_KEY, '{not json');
    expect(loadSnapshot(kv)).toBeNull();
  });

  it('returns null for a malformed collection', () => {
    const kv = new InMemoryKeyValueStore();
    kv.set(
      SAVE_KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, collection: { ownedCards: 'nope' } }),
    );
    expect(loadSnapshot(kv)).toBeNull();
  });

  it('returns null for an unmigratable (too-old / unknown) version', () => {
    const kv = new InMemoryKeyValueStore();
    kv.set(SAVE_KEY, JSON.stringify({ schemaVersion: 0, collection: collection(), settings: {} }));
    expect(loadSnapshot(kv)).toBeNull(); // no migration registered from version 0
  });

  it('returns null when a card instance is missing fields', () => {
    const kv = new InMemoryKeyValueStore();
    kv.set(
      SAVE_KEY,
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        collection: { ownedCards: [{ instanceId: 'x' }], ownedWeapons: [], ownedArmor: [] },
        settings: {},
      }),
    );
    expect(loadSnapshot(kv)).toBeNull(); // defId missing
  });

  it('returns null when a weapon is malformed', () => {
    const kv = new InMemoryKeyValueStore();
    kv.set(
      SAVE_KEY,
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        collection: {
          ownedCards: [],
          ownedWeapons: [{ id: 'w', name: 'W', tier: 1 }],
          ownedArmor: [],
        },
        settings: {},
      }),
    );
    expect(loadSnapshot(kv)).toBeNull(); // attackBonus missing
  });

  it('reads settings tolerantly, filling defaults for missing/invalid fields', () => {
    const kv = new InMemoryKeyValueStore();
    kv.set(
      SAVE_KEY,
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        collection: collection(),
        settings: { soundEnabled: false },
      }),
    );
    expect(loadSnapshot(kv)?.settings).toEqual({
      soundEnabled: false,
      language: DEFAULT_SETTINGS.language,
      difficulty: DEFAULT_SETTINGS.difficulty,
    });
  });

  it('createPersistence facade saves and loads', () => {
    const p = createPersistence(new InMemoryKeyValueStore());
    const snap: SaveSnapshot = {
      schemaVersion: SCHEMA_VERSION,
      collection: collection(),
      settings: DEFAULT_SETTINGS,
    };
    p.save(snap);
    expect(p.load()).toEqual(snap);
  });
});
