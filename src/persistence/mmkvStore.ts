/**
 * MMKV-backed {@link KeyValueStore} — the production native storage.
 *
 * Imported ONLY by the app entry (never by the core/tests) so jest/node never load the native
 * module. react-native-mmkv v4 (Nitro) creates instances via `createMMKV` and exposes
 * `getString`/`set`/`remove`, which the {@link KeyValueStore} contract maps onto.
 */
import { createMMKV } from 'react-native-mmkv';
import type { MMKV } from 'react-native-mmkv';
import type { KeyValueStore } from './types';

export class MmkvKeyValueStore implements KeyValueStore {
  private readonly mmkv: MMKV = createMMKV({ id: 'yar' });

  getString(key: string): string | undefined {
    return this.mmkv.getString(key);
  }

  set(key: string, value: string): void {
    this.mmkv.set(key, value);
  }

  delete(key: string): void {
    this.mmkv.remove(key);
  }
}
