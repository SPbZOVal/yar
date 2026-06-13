import { CombatPhase } from '../../../model';
import type { CombatState, EnemyInstance, Entity } from '../../../model';
import { checkOutcome, withOutcome } from '../selectors';

const entity = (hp: number): Entity => ({ hp, baseMaxHp: 50, statuses: [] });
const enemy = (hp: number): EnemyInstance => ({
  entity: entity(hp),
  defId: 'e',
  currentIntentIndex: 0,
});

function state(overrides: Partial<CombatState> = {}): CombatState {
  return {
    player: entity(50),
    enemies: [enemy(10)],
    drawPile: [],
    hand: [],
    discardPile: [],
    exhaustPile: [],
    energy: 3,
    turn: 1,
    phase: CombatPhase.PlayerTurn,
    rng: 0,
    ...overrides,
  };
}

describe('checkOutcome', () => {
  it('is Defeat when the player is down', () => {
    expect(checkOutcome(state({ player: entity(0) }))).toBe(CombatPhase.Defeat);
  });

  it('is Victory when every enemy is down', () => {
    expect(checkOutcome(state({ enemies: [enemy(0)] }))).toBe(CombatPhase.Victory);
  });

  it('passes the current phase through otherwise', () => {
    expect(checkOutcome(state())).toBe(CombatPhase.PlayerTurn);
  });
});

describe('withOutcome', () => {
  it('folds a terminal outcome into the phase', () => {
    expect(withOutcome(state({ player: entity(0) })).phase).toBe(CombatPhase.Defeat);
  });

  it('returns the same reference when the phase is unchanged', () => {
    const s = state();
    expect(withOutcome(s)).toBe(s);
  });
});
