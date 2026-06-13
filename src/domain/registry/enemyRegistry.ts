/**
 * Enemy registry — resolve a `defId` to its {@link EnemyDefinition}.
 *
 * Built from the `content/enemies` data; the combat reducer reads it to run an
 * enemy's telegraphed intents, keeping `EnemyInstance` minimal (just `defId`).
 */
import type { EnemyDefinition } from '../model';
import { ENEMIES } from '../content/enemies';

export const ENEMY_DEFS: ReadonlyMap<string, EnemyDefinition> = new Map(
  ENEMIES.map((enemy) => [enemy.id, enemy]),
);

/** Resolve an enemy `defId`; throws on an unknown id (a content bug, never user input). */
export function getEnemyDef(defId: string): EnemyDefinition {
  const def = ENEMY_DEFS.get(defId);
  if (def === undefined) throw new Error(`Unknown enemy def: ${defId}`);
  return def;
}
