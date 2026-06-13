/**
 * Enemy turn — execute each living enemy's telegraphed intent, deterministically.
 *
 * Behaviour is fixed and RNG-free: an enemy runs `intents[currentIntentIndex]` and
 * advances the index (mod length). Intents reuse the SAME entity ops as the player's
 * cards, so an enemy "attack" and a player attack share one code path. The `intent.kind`
 * string is the seam where a richer intent registry would plug in later.
 */
import { dealDamage, gainBlock } from '../../entity/entity';
import type { CombatState, EnemyDefinition } from '../../model';

export function runEnemyIntents(
  state: CombatState,
  getEnemyDef: (defId: string) => EnemyDefinition,
): CombatState {
  return state.enemies.reduce((acc, enemy, i) => {
    if (enemy.entity.hp <= 0) return acc; // dead enemies do nothing
    const intents = getEnemyDef(enemy.defId).intents;
    if (intents.length === 0) return acc;
    const intent = intents[enemy.currentIntentIndex % intents.length];
    const advanced = {
      ...enemy,
      currentIntentIndex: (enemy.currentIntentIndex + 1) % intents.length,
    };

    if (intent === undefined) {
      return { ...acc, enemies: acc.enemies.map((e, j) => (j === i ? advanced : e)) };
    }
    if (intent.kind === 'attack') {
      const player = dealDamage(enemy.entity, intent.value)(acc.player);
      return {
        ...acc,
        player,
        enemies: acc.enemies.map((e, j) => (j === i ? advanced : e)),
      };
    }
    if (intent.kind === 'block') {
      const updated = { ...advanced, entity: gainBlock(enemy.entity, intent.value) };
      return { ...acc, enemies: acc.enemies.map((e, j) => (j === i ? updated : e)) };
    }
    // Unknown intent kind: just advance the cycle.
    return { ...acc, enemies: acc.enemies.map((e, j) => (j === i ? advanced : e)) };
  }, state);
}
