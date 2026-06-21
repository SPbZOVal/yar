/** Barrel for the domain data model (docs/architecture/03-data-model.md). */

// Enumerations are runtime values (`as const` objects) and types — re-export both.
export {
  CardType,
  CardCategory,
  EffectKind,
  TargetType,
  Targeting,
  DeckOp,
  Rarity,
  NodeType,
  CombatPhase,
} from './enums';
export { Lifetime, StatusKind } from './status';

export type {
  Effect,
  ApplyStatusEffect,
  DeckManipulationEffect,
  CardDefinition,
  CardInstance,
} from './cards';
export type { Status } from './status';
export type {
  StatusBehavior,
  StatContribution,
  StatKey,
  StatusApplyCtx,
  EntityOp,
  ResolveCtx,
  EffectHandler,
  EffectHandlerMap,
} from './behavior';
export type { Weapon, Armor, PlayerState } from './player';
export type { Collection, RunDeck } from './collection';
export type {
  Entity,
  EnemyIntent,
  EnemyDefinition,
  EnemyInstance,
  CombatState,
  CombatantRef,
} from './combat';
export type {
  LootReward,
  QuestionData,
  NodeContent,
  LevelNode,
  LevelEdge,
  LevelGraph,
  GenerationParams,
} from './level';
export type { ScreenState, RunState } from './run';
