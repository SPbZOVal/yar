import { screen } from '@testing-library/react-native';
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

  it('plays an AoE card on every enemy from a tap, no enemy target (cleave → 4 each)', async () => {
    const store = withCombat(
      combat({
        hand: [{ instanceId: 'cc', defId: 'cleave', upgraded: false }],
        enemies: [
          { entity: { hp: 8, baseMaxHp: 8, statuses: [] }, defId: 'bat', currentIntentIndex: 0 },
          { entity: { hp: 8, baseMaxHp: 8, statuses: [] }, defId: 'bat', currentIntentIndex: 0 },
        ],
      }),
    );
    await renderWithStore(<CombatScreen />, store);
    await press('card-cc'); // AoE card plays immediately — no enemy tap
    const hps = store.getState().run.combat?.enemies.map((e) => e.entity.hp);
    expect(hps).toEqual([4, 4]); // the engine fanned the cleave out to both
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

  it('resolves an interactive scry: chosen revealed card goes to hand, the rest are discarded', async () => {
    const store = withCombat(
      combat({
        hand: [],
        drawPile: [
          { instanceId: 'd1', defId: 'strike', upgraded: false },
          { instanceId: 'd2', defId: 'defend', upgraded: false },
          { instanceId: 'd3', defId: 'strike', upgraded: false },
        ],
        pendingSelection: { candidateIds: ['d1', 'd2', 'd3'], pick: 3 },
      }),
    );
    await renderWithStore(<CombatScreen />, store);
    await press('select-d2'); // keep d2
    await press('confirm-selection');
    const c = store.getState().run.combat;
    expect(c?.pendingSelection).toBeUndefined();
    expect(c?.hand.map((x) => x.instanceId)).toEqual(['d2']);
    expect(c?.discardPile.map((x) => x.instanceId)).toEqual(['d1', 'd3']);
  });

  // The flashes are no-op overlays under the jest mocks (timing verified on-device); this just
  // asserts they mount and the damage path still resolves through them.
  it('renders damage hit-flash overlays and still plays a damaging card through them', async () => {
    const store = withCombat(combat());
    await renderWithStore(<CombatScreen />, store);
    expect(screen.getByTestId('flash-player')).toBeTruthy();
    expect(screen.getByTestId('flash-enemy-0')).toBeTruthy();
    await press('card-c1');
    await press('enemy-0');
    expect(store.getState().run.combat?.enemies[0]?.entity.hp).toBe(2); // 8 - 6, overlay didn't block
  });
});
