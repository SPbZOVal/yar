/** Pure combat selectors. Reads only; phase transitions live in the reducers. */
import { CombatPhase } from '../../model';
import type { CombatState } from '../../model';

/**
 * Terminal-phase classifier: Defeat if the player is down, Victory if every enemy is
 * down, otherwise the current (non-terminal) phase unchanged.
 */
export function checkOutcome(state: CombatState): CombatPhase {
  if (state.player.hp <= 0) return CombatPhase.Defeat;
  if (state.enemies.every((e) => e.entity.hp <= 0)) return CombatPhase.Victory;
  return state.phase;
}

/** Fold the outcome into the state's phase. The only place a reducer sets a terminal phase. */
export function withOutcome(state: CombatState): CombatState {
  const phase = checkOutcome(state);
  return phase === state.phase ? state : { ...state, phase };
}
