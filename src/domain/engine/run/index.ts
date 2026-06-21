/** Barrel for the run reducer: pure reducer + production deps from content/registries. */
import { BALANCE_CONSTANTS, GENERATION_PARAMS, maxHpFormula } from '../../ruleset/ruleset';
import { CombatPhase, Lifetime, StatusKind } from '../../model';
import type { CombatState, Entity, PlayerState, Status } from '../../model';
import { getCardDef } from '../../registry/cardRegistry';
import { getEnemyDef } from '../../registry/enemyRegistry';
import { getWeaponDef, upgradeWeapon } from '../../registry/weaponRegistry';
import { getArmorDef } from '../../registry/armorRegistry';
import { STARTER_DECK } from '../../content/starterDeck';
import { STARTER_WEAPON_ID } from '../../content/weapons';
import { STARTER_ARMOR_ID } from '../../content/armor';
import { combatReducer } from '../combat';
import type { CombatDeps } from '../combat';
import { defaultLevelGenDeps, generateLevel } from '../level';
import { defaultLootDeps, rollBossLoot, rollChestLoot } from '../loot';
import { applySpecialCard } from './specialCards';
import type { RunDeps } from './runReducer';

export { runReducer } from './runReducer';
export type { RunAction, RunDeps } from './runReducer';

/**
 * Build `CombatDeps` for a player — the content registries plus the player's per-turn hand
 * size / energy. Shared by `startCombat` (below) and the store, which dispatches in-combat
 * actions (`PlayCard`/`EndTurn`) against `run.combat` between `EnterNode`/`ResolveCombat`.
 */
export const defaultCombatDeps = (player: PlayerState): CombatDeps => ({
  getDef: getCardDef,
  getEnemyDef,
  handSize: player.handSize,
  energyPerTurn: player.energyPerTurn,
  // The armor's passive Block, re-granted by the reducer at the start of every player turn.
  passiveBlock: player.armor.blockBonus,
});

/** Placeholder state for `StartCombat` — the reducer ignores it and builds combat fresh. */
const EMPTY_COMBAT: CombatState = {
  player: { hp: 0, baseMaxHp: 0, statuses: [] },
  enemies: [],
  drawPile: [],
  hand: [],
  discardPile: [],
  exhaustPile: [],
  energy: 0,
  turn: 0,
  phase: CombatPhase.PlayerTurn,
  rng: 0,
};

/**
 * The starting {@link PlayerState} for a new run: base stats from `RuleSet`, the starter
 * weapon/armor, and `maxHp` via `maxHpFormula` (no special bonus yet). The store dispatches
 * `StartRun` with this (or a meta-modified variant) at the top of the run.
 */
export const defaultPlayer = (): PlayerState => {
  const weapon = getWeaponDef(STARTER_WEAPON_ID);
  const armor = getArmorDef(STARTER_ARMOR_ID);
  const maxHp = maxHpFormula(BALANCE_CONSTANTS.baseMaxHp, armor.maxHpBonus, 0);
  return {
    baseMaxHp: BALANCE_CONSTANTS.baseMaxHp,
    currentHp: maxHp,
    maxHp,
    handSize: BALANCE_CONSTANTS.defaultHandSize,
    energyPerTurn: BALANCE_CONSTANTS.defaultEnergyPerTurn,
    weapon,
    armor,
  };
};

/**
 * Project `PlayerState` → combat `Entity`. Equipment / meta bonuses enter combat as
 * statuses — the model's single source of truth for modifiers — so combat re-derives
 * `maxHp` (baseMaxHp + MaxHpUp) and attack (Σ AttackUp) consistently:
 *  - `armor.maxHpBonus` + "+heart" specials → one `MaxHpUp` (their combined contribution is
 *    `player.maxHp - player.baseMaxHp`), keeping derived maxHp == `player.maxHp`;
 *  - `weapon.attackBonus` → `AttackUp`, so the weapon finally boosts outgoing damage.
 * `baseMaxHp` stays the player's base (NOT `player.maxHp`) so the bonuses aren't double-counted.
 */
function projectPlayer(player: PlayerState): Entity {
  const statuses: Status[] = [];
  const maxHpBonus = player.maxHp - player.baseMaxHp;
  if (maxHpBonus > 0) {
    statuses.push({ kind: StatusKind.MaxHpUp, stacks: maxHpBonus, lifetime: Lifetime.Run });
  }
  if (player.weapon.attackBonus > 0) {
    statuses.push({
      kind: StatusKind.AttackUp,
      stacks: player.weapon.attackBonus,
      lifetime: Lifetime.Run,
    });
  }
  // `armor.blockBonus` is NOT a one-time status here: clearBlock strips Block each turn, so the
  // combat reducer re-grants it every player turn from `CombatDeps.passiveBlock` instead.
  return { hp: player.currentHp, baseMaxHp: player.baseMaxHp, statuses };
}

/**
 * Production run deps: starter deck + level generation + loot rollers pre-bound to their
 * content deps, and a combat starter that builds `CombatDeps` from the player + registries.
 */
export const defaultRunDeps = (): RunDeps => {
  const lootDeps = defaultLootDeps();
  return {
    maxDeckSize: BALANCE_CONSTANTS.maxDeckSize,
    generationParams: GENERATION_PARAMS,
    starterCards: STARTER_DECK,
    generateLevel: (params, seed) => generateLevel(params, defaultLevelGenDeps(), seed),
    startCombat: (player, enemies, deck, seed) =>
      combatReducer(defaultCombatDeps(player), EMPTY_COMBAT, {
        type: 'StartCombat',
        player: projectPlayer(player),
        enemies,
        deck,
        seed,
      }),
    rollChestLoot: (seed) => rollChestLoot(lootDeps, seed),
    rollBossLoot: (seed, isEndBoss) => rollBossLoot(lootDeps, seed, isEndBoss),
    applySpecialCard: (player, def) => applySpecialCard(player, def, { upgradeWeapon }),
  };
};
