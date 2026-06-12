/** Level graph, loot, questions, and generation params. See §7.4, §7.6, §11.2. */
import type { CardDefinition } from './cards';
import type { EnemyDefinition } from './combat';
import type { NodeType } from './enums';
import type { Armor, Weapon } from './player';

/** Reward rolled from a chest, combat, or boss. (§7.6) */
export interface LootReward {
  readonly cards: readonly CardDefinition[];
  readonly weapon?: Weapon;
  readonly armor?: Armor;
  /** Marks special loot dropped after the end boss. */
  readonly isSpecial: boolean;
}

/** A quiz between battles. A wrong answer yields nothing (no penalty). (§7.6, §9) */
export interface QuestionData {
  readonly text: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly rewardOnCorrect: LootReward;
}

/**
 * Interactive content of a node, as a discriminated union on `kind`.
 * Structural nodes (Start / End-without-fight / Idle) simply carry no content.
 * (§7.4)
 */
export type NodeContent =
  | { readonly kind: 'combat'; readonly enemies: readonly EnemyDefinition[] }
  | { readonly kind: 'boss'; readonly boss: EnemyDefinition; readonly specialLoot: boolean }
  | { readonly kind: 'loot'; readonly reward: LootReward }
  | { readonly kind: 'question'; readonly question: QuestionData };

/** A vertex of the k-partite level graph. (§7.4) */
export interface LevelNode {
  readonly id: string;
  readonly type: NodeType;
  /** Index of the partition (layer) this node belongs to. */
  readonly layer: number;
  /** Absent for structural nodes (Start / Idle). */
  readonly content?: NodeContent;
  readonly visited: boolean;
}

/** A directed edge; `from` is nearer the start, `to` nearer the end. (§7.4) */
export interface LevelEdge {
  readonly from: string;
  readonly to: string;
}

/** A generated level: a k-partite directed graph from one start to one end. (§7.4) */
export interface LevelGraph {
  readonly nodes: ReadonlyMap<string, LevelNode>;
  readonly edges: readonly LevelEdge[];
  readonly startId: string;
  readonly endId: string;
  readonly layerCount: number;
  readonly currentNodeId: string;
}

/** Tunable level-generation parameters; lives in RuleSet. (§11.2) */
export interface GenerationParams {
  /** Number of layers (k). */
  readonly layerCount: { readonly min: number; readonly max: number };
  /** Nodes per layer. */
  readonly layerWidth: { readonly min: number; readonly max: number };
  /** Relative weights for content placement. */
  readonly nodeWeights: {
    readonly combat: number;
    readonly loot: number;
    readonly question: number;
  };
  /** Number of mid-level bosses (1–2). */
  readonly midBossCount: { readonly min: number; readonly max: number };
  /** Edge density, 0..1. */
  readonly edgeDensity: number;
  /** Difficulty ramp toward the end. */
  readonly difficultyScaling: number;
}
