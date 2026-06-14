import { CombatPhase } from '../../domain/model';
import type { CombatState } from '../../domain/model';
import { InMemoryKeyValueStore, createPersistence } from '../../persistence';
import { createDefaultGameStore } from '..';
import {
  selectCollection,
  selectCombat,
  selectEnemies,
  selectEnergy,
  selectHand,
  selectLevel,
  selectPlayer,
  selectScreen,
  selectSettings,
} from '../selectors';

const store = () => createDefaultGameStore(createPersistence(new InMemoryKeyValueStore()), 'sel');

describe('selectors', () => {
  it('reads run-level slices and combat-off fallbacks', () => {
    const s = store().getState();
    expect(selectScreen(s)).toBe('deckBuilding');
    expect(selectPlayer(s)).toBe(s.run.player);
    expect(selectCollection(s)).toBe(s.run.collection);
    expect(selectLevel(s)).toBeNull();
    expect(selectSettings(s)).toBeDefined();
    expect(selectCombat(s)).toBeNull();
    expect(selectHand(s)).toEqual([]);
    expect(selectEnemies(s)).toEqual([]);
    expect(selectEnergy(s)).toBe(0);
  });

  it('reads combat slices when a fight is active', () => {
    const st = store();
    const combat: CombatState = {
      player: { hp: 30, baseMaxHp: 50, statuses: [] },
      enemies: [
        { entity: { hp: 8, baseMaxHp: 8, statuses: [] }, defId: 'bat', currentIntentIndex: 0 },
      ],
      drawPile: [],
      hand: [{ instanceId: 'h1', defId: 'strike', upgraded: false }],
      discardPile: [],
      exhaustPile: [],
      energy: 3,
      turn: 1,
      phase: CombatPhase.PlayerTurn,
      rng: 0,
    };
    st.setState({ run: { ...st.getState().run, combat } });
    const s = st.getState();
    expect(selectCombat(s)).toBe(combat);
    expect(selectHand(s)).toHaveLength(1);
    expect(selectEnemies(s)).toHaveLength(1);
    expect(selectEnergy(s)).toBe(3);
  });
});
