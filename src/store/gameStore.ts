/**
 * GameStore — a thin Zustand shell over the pure domain reducers (docs §6.1). It holds the
 * domain `RunState` (which already embeds the active `combat` and the working `collection`) plus
 * `settings`, and does nothing but dispatch actions into the reducers and persist meta on change.
 * All game logic stays in the domain; the store never branches on rules.
 *
 * The docs' four "slices" (run/combat/meta/settings) are exposed as SELECTORS over this state
 * (see ./selectors), not duplicated: `combat` = `run.combat`, the meta `collection` = `run.collection`.
 */
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import { produce } from 'immer';
import { runReducer } from '../domain/engine/run';
import type { RunAction, RunDeps } from '../domain/engine/run';
import { combatReducer } from '../domain/engine/combat';
import type { CombatAction, CombatDeps } from '../domain/engine/combat';
import type { PlayerState, RunState } from '../domain/model';
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from '../persistence';
import type { Persistence, Settings } from '../persistence';

/** The store's state + the (only) mutators: dispatch + select, no logic. */
export interface GameState {
  readonly run: RunState;
  readonly settings: Settings;
  /** Apply a run action through `runReducer`. */
  readonly dispatch: (action: RunAction) => void;
  /** Apply an in-combat action against `run.combat` (no-op when no fight is active). */
  readonly dispatchCombat: (action: CombatAction) => void;
  /** Start a fresh run, keeping the persisted collection (the starter seed only on first launch). */
  readonly newRun: (seed: string) => void;
  /** Patch player settings (persisted). */
  readonly updateSettings: (patch: Partial<Settings>) => void;
}

/** Everything the store needs injected (production wiring in ./index, test wiring in tests). */
export interface GameStoreDeps {
  readonly runDeps: RunDeps;
  readonly combatDeps: (player: PlayerState) => CombatDeps;
  readonly newPlayer: () => PlayerState;
  readonly initialSeed: string;
  readonly persistence?: Persistence | undefined;
}

// `reduceStartRun` ignores its prior-state argument (it builds a fresh RunState), so any value
// seeds the very first run — avoids needing a hand-built initial RunState here.
const IGNORED_PRIOR = {} as unknown as RunState;

/** Start a run, overlaying the persisted collection so a returning player keeps their unlocks. */
function startRun(deps: GameStoreDeps, seed: string): RunState {
  const fresh = runReducer(deps.runDeps, IGNORED_PRIOR, {
    type: 'StartRun',
    seed,
    player: deps.newPlayer(),
  });
  const saved = deps.persistence?.load();
  return saved && saved.collection.ownedCards.length > 0
    ? { ...fresh, collection: saved.collection }
    : fresh;
}

/** Build a vanilla store (used directly in tests; wrapped as a React hook in the app). */
export function createGameStore(deps: GameStoreDeps): StoreApi<GameState> {
  const settings = deps.persistence?.load()?.settings ?? DEFAULT_SETTINGS;

  const store = createStore<GameState>((set, get) => ({
    run: startRun(deps, deps.initialSeed),
    settings,
    dispatch: (action) => set({ run: runReducer(deps.runDeps, get().run, action) }),
    dispatchCombat: (action) => {
      const { run } = get();
      if (run.combat === null) return;
      const combat = combatReducer(deps.combatDeps(run.player), run.combat, action);
      set({ run: { ...run, combat } });
    },
    newRun: (seed) => set({ run: startRun(deps, seed) }),
    updateSettings: (patch) =>
      set({
        settings: produce(get().settings, (draft) => {
          Object.assign(draft, patch);
        }),
      }),
  }));

  // Persist meta (collection + settings) at boot and whenever either reference changes.
  const persistence = deps.persistence;
  if (persistence !== undefined) {
    let prevCollection = store.getState().run.collection;
    let prevSettings = store.getState().settings;
    const save = (): void =>
      persistence.save({
        schemaVersion: SCHEMA_VERSION,
        collection: prevCollection,
        settings: prevSettings,
      });
    save();
    store.subscribe((state) => {
      if (state.run.collection !== prevCollection || state.settings !== prevSettings) {
        prevCollection = state.run.collection;
        prevSettings = state.settings;
        save();
      }
    });
  }

  return store;
}
