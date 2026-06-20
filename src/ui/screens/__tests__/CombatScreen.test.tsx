import { CombatPhase } from '../../../domain/model';
import type { CombatState } from '../../../domain/model';
import { CombatScreen } from '../CombatScreen';
import { makeStore, press, renderWithStore } from './renderWithStore';

const combat = (overrides: Partial<CombatState> = {}): CombatState => ({
  player: { hp: 30, baseMaxHp: 50, statuses: [] },
  enemies: [{ entity: { hp: 8, baseMaxHp: 8, statuses: [] }, defId: 'bat', currentIntentIndex: 0 }],
  drawPile: [],
  hand: [{ instanceId: 'c1', defId: 'strike', upgraded: false }],
  discardPile: [],
  exhaustPile: [],
  energy: 3,
  turn: 1,
  phase: CombatPhase.PlayerTurn,
  rng: 0,
  ...overrides,
});

const withCombat = (c: CombatState) => {
  const store = makeStore();
  store.setState({ run: { ...store.getState().run, combat: c, screen: { name: 'combat' } } });
  return store;
};

describe('CombatScreen', () => {
  it('plays a targeted card on the tapped enemy (strike → 6 dmg)', async () => {
    const store = withCombat(combat());
    await renderWithStore(<CombatScreen />, store);
    await press('card-c1'); // select the card (needs a target)
    await press('enemy-0'); // play it on this enemy
    expect(store.getState().run.combat?.enemies[0]?.entity.hp).toBe(2);
  });

  it('ends the turn', async () => {
    const store = withCombat(combat());
    await renderWithStore(<CombatScreen />, store);
    await press('end-turn');
    expect(store.getState().run.combat?.turn).toBe(2);
  });

  it('resolves combat on victory', async () => {
    const won = combat({
      enemies: [
        { entity: { hp: 0, baseMaxHp: 8, statuses: [] }, defId: 'bat', currentIntentIndex: 0 },
      ],
      phase: CombatPhase.Victory,
    });
    const store = withCombat(won);
    await renderWithStore(<CombatScreen />, store);
    await press('resolve-combat');
    expect(store.getState().run.combat).toBeNull();
  });
});
