/**
 * Enemy turn — execute each living enemy's telegraphed intent, deterministically.
 *
 * Behaviour is fixed and RNG-free: an enemy runs `intents[currentIntentIndex]` and
 * advances the index (mod length). The `intent.kind` string is dispatched through the
 * {@link INTENT_HANDLERS} registry (no switch here), and each handler reuses the SAME
 * entity ops as the player's cards, so an enemy "attack" and a player attack share one
 * code path. An unknown kind has no handler and simply advances the cycle.
 */
import type { CombatState, EnemyDefinition } from '../../model';
import { getIntentHandler } from '../../registry/intentRegistry';

export function runEnemyIntents(
  state: CombatState,
  getEnemyDef: (defId: string) => EnemyDefinition,
): CombatState {
  return state.enemies.reduce((acc, enemy, i) => {
    if (enemy.entity.hp <= 0) return acc; // dead enemies do nothing
    const intents = getEnemyDef(enemy.defId).intents;
    if (intents.length === 0) return acc;
    const intent = intents[enemy.currentIntentIndex % intents.length];
    // Advance the telegraphed cycle on this enemy regardless of what the intent does.
    const advanced = acc.enemies.map((e, j) =>
      j === i ? { ...e, currentIntentIndex: (e.currentIntentIndex + 1) % intents.length } : e,
    );
    const withAdvance: CombatState = { ...acc, enemies: advanced };
    if (intent === undefined) return withAdvance;
    const handler = getIntentHandler(intent.kind);
    return handler === undefined ? withAdvance : handler(withAdvance, i, intent.value);
  }, state);
}
