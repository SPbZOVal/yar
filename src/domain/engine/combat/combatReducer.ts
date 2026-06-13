/**
 * Combat reducer — a pure `(deps, state, action) -> state` dispatch over a typed table.
 *
 * This is the functional CombatEngine: each action is data, each reducer composes the
 * existing pure pieces (`applyCard`, `DeckManager`, entity ops) and never mutates. It
 * owns the concerns the resolver deferred: energy/cost, the play→discard/exhaust pile
 * policy, the enemy upkeep pipeline, and threading the RNG cursor for determinism.
 */
import { CardType, CombatPhase } from '../../model';
import type {
  CardDefinition,
  CombatState,
  EnemyDefinition,
  EnemyInstance,
  Status,
} from '../../model';
import { Rand } from '../../rng/rng';
import { clearBlock, tickStatuses } from '../../entity/entity';
import { discard, draw, exhaust } from '../../deck/deckManager';
import { applyCard } from '../../cardResolver/cardResolver';
import type { CombatAction } from './actions';
import { withOutcome } from './selectors';
import { runEnemyIntents } from './enemyTurn';

/** Content/config the reducer needs but cannot derive from `CombatState`. */
export interface CombatDeps {
  readonly getDef: (defId: string) => CardDefinition;
  readonly getEnemyDef: (defId: string) => EnemyDefinition;
  readonly handSize: number;
  readonly energyPerTurn: number;
}

/** Build a fresh enemy instance at full HP from its definition. */
function instantiate(def: EnemyDefinition): EnemyInstance {
  const statuses: readonly Status[] = [];
  return {
    entity: { hp: def.maxHp, baseMaxHp: def.maxHp, statuses },
    defId: def.id,
    currentIntentIndex: 0,
  };
}

function reduceStartCombat(
  deps: CombatDeps,
  _state: CombatState,
  action: Extract<CombatAction, { type: 'StartCombat' }>,
): CombatState {
  const [drawPile, rng] = Rand.run(Rand.shuffle(action.deck), action.seed);
  const base: CombatState = {
    player: action.player,
    enemies: action.enemies.map(instantiate),
    drawPile,
    hand: [],
    discardPile: [],
    exhaustPile: [],
    energy: deps.energyPerTurn,
    turn: 1,
    phase: CombatPhase.PlayerTurn,
    rng,
  };
  return draw(base, deps.handSize);
}

function reducePlayCard(
  deps: CombatDeps,
  state: CombatState,
  action: Extract<CombatAction, { type: 'PlayCard' }>,
): CombatState {
  if (state.phase !== CombatPhase.PlayerTurn) return state;
  const inHand = state.hand.find((c) => c.instanceId === action.instanceId);
  if (inHand === undefined) return state;
  const def = deps.getDef(inHand.defId);
  if (def.cost > state.energy) return state;

  const paid: CombatState = { ...state, energy: state.energy - def.cost };
  const resolved = applyCard(paid, def, action.source, action.targets);
  const moved: CombatState =
    def.type === CardType.SingleUse ? exhaust(resolved, inHand) : discard(resolved, inHand);
  return withOutcome(moved);
}

/** Tick statuses (poison, decay) on the player and every enemy. */
function tickAll(state: CombatState): CombatState {
  return {
    ...state,
    player: tickStatuses(state.player),
    enemies: state.enemies.map((e) => ({ ...e, entity: tickStatuses(e.entity) })),
  };
}

function reduceEndTurn(deps: CombatDeps, state: CombatState): CombatState {
  if (state.phase !== CombatPhase.PlayerTurn) return state;

  const afterEnemies = withOutcome(runEnemyIntents(state, deps.getEnemyDef));
  if (afterEnemies.phase === CombatPhase.Defeat) return afterEnemies;

  const ticked = withOutcome(tickAll(afterEnemies));
  if (ticked.phase !== CombatPhase.PlayerTurn) return ticked;

  const upkept: CombatState = {
    ...ticked,
    player: clearBlock(ticked.player),
    energy: deps.energyPerTurn,
    turn: ticked.turn + 1,
    phase: CombatPhase.PlayerTurn,
  };
  return withOutcome(draw(upkept, Math.max(0, deps.handSize - upkept.hand.length)));
}

/** Typed dispatch table: one reducer per action type, each typed to its payload. */
type CombatReducerTable = {
  readonly [T in CombatAction['type']]: (
    deps: CombatDeps,
    state: CombatState,
    action: Extract<CombatAction, { type: T }>,
  ) => CombatState;
};

const TABLE: CombatReducerTable = {
  StartCombat: reduceStartCombat,
  PlayCard: reducePlayCard,
  EndTurn: reduceEndTurn,
};

/**
 * Apply one combat action, purely. The single dispatch cast is localized here: the
 * table is keyed by `CombatAction['type']`, so the reducer at `action.type` takes
 * exactly this action's payload.
 */
export function combatReducer(
  deps: CombatDeps,
  state: CombatState,
  action: CombatAction,
): CombatState {
  const run = TABLE[action.type] as (
    deps: CombatDeps,
    state: CombatState,
    action: CombatAction,
  ) => CombatState;
  return run(deps, state, action);
}
