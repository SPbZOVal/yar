/**
 * LevelGenerator — pure, deterministic procedural generation of a level (§11).
 *
 * A level is a k-partite DAG: one `Start` (layer 0), one `Boss` end (layer k-1), and
 * interior layers in between. Edges run forward only, between adjacent layers, so the
 * graph is acyclic by construction; every node is given ≥1 outgoing and ≥1 incoming edge
 * so `start → … → end` is always reachable with no dead-ends or orphans.
 *
 * The whole build threads a single {@link Seed} (mutated only inside this pure function,
 * never observed outside), so the same `(params, deps, seed)` always yields an identical
 * graph. Content (enemies / loot / questions) and tuning are injected via {@link
 * LevelGenDeps}; the algorithm itself holds no content. A validate-or-regenerate loop
 * (bounded by `deps.maxRetries`) guards the connectivity/balance invariants.
 */
import { NodeType } from '../../model';
import type {
  EnemyDefinition,
  GenerationParams,
  LevelEdge,
  LevelGraph,
  LevelNode,
  LootReward,
  NodeContent,
  QuestionData,
} from '../../model';
import { Rand } from '../../rng/rng';
import type { Rand as RandT, Seed } from '../../rng/rng';

/** Content providers + caps the generator needs but cannot derive from params. */
export interface LevelGenDeps {
  /** Non-boss enemies for combat nodes. */
  readonly enemyPool: readonly EnemyDefinition[];
  /** Boss enemies for the end + mid-boss nodes (must be non-empty). */
  readonly bossPool: readonly EnemyDefinition[];
  readonly rollChestLoot: (seed: Seed) => readonly [LootReward, Seed];
  readonly rollQuestion: (seed: Seed) => readonly [QuestionData, Seed];
  /** Bounded validate-or-regenerate attempts before throwing. */
  readonly maxRetries: number;
  /** Cap on enemies difficulty scaling may stack onto one combat node. */
  readonly maxEnemiesPerNode: number;
}

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
const span = (r: { readonly min: number; readonly max: number }): number =>
  Math.max(1, r.max - r.min + 1);
const nodeId = (layer: number, idx: number): string => `L${layer}N${idx}`;

/** A coin flip that comes up `true` with probability `p` (clamped to [0,1]). */
const chance =
  (p: number): RandT<boolean> =>
  (seed) => {
    const [n, next] = Rand.nextInt(1000)(seed);
    return [n < Math.round(clamp(p, 0, 1) * 1000), next];
  };

/** One generation attempt: build a graph, threading the seed imperatively but purely. */
function buildGraph(
  params: GenerationParams,
  deps: LevelGenDeps,
  seed0: Seed,
): readonly [LevelGraph, Seed] {
  let seed = seed0;
  const next = <A>(r: RandT<A>): A => {
    const [a, s] = r(seed);
    seed = s;
    return a;
  };

  // 1. layer count k and per-layer widths (start/end layers are singletons).
  const k = Math.max(2, params.layerCount.min + next(Rand.nextInt(span(params.layerCount))));
  const widths: number[] = [];
  for (let layer = 0; layer < k; layer++) {
    widths.push(
      layer === 0 || layer === k - 1
        ? 1
        : params.layerWidth.min + next(Rand.nextInt(span(params.layerWidth))),
    );
  }
  const layers: string[][] = widths.map((w, layer) =>
    Array.from({ length: w }, (_, idx) => nodeId(layer, idx)),
  );

  // 2. edges: density pass, then guarantee ≥1 outgoing per node and ≥1 incoming per node.
  const edges: LevelEdge[] = [];
  for (let layer = 0; layer < k - 1; layer++) {
    const from = layers[layer] as readonly string[];
    const to = layers[layer + 1] as readonly string[];
    for (const u of from) {
      for (const v of to) {
        if (next(chance(params.edgeDensity))) edges.push({ from: u, to: v });
      }
    }
    for (const u of from) {
      if (!edges.some((e) => e.from === u && to.includes(e.to))) {
        edges.push({ from: u, to: to[next(Rand.nextInt(to.length))] as string });
      }
    }
    for (const v of to) {
      if (!edges.some((e) => e.to === v && from.includes(e.from))) {
        edges.push({ from: from[next(Rand.nextInt(from.length))] as string, to: v });
      }
    }
  }

  // 3. bosses: the end node, plus 1–2 mid-bosses preferring the back half of the graph.
  const startId = nodeId(0, 0);
  const endId = nodeId(k - 1, 0);
  const bossIds = new Set<string>([endId]);
  const m = params.midBossCount.min + next(Rand.nextInt(span(params.midBossCount)));
  const interior = layers.flatMap((ids, layer) =>
    layer === 0 || layer === k - 1 ? [] : ids.map((id) => ({ id, layer })),
  );
  const backHalf = interior.filter((n) => n.layer >= Math.floor(k / 2));
  const pickFrom = (backHalf.length >= m ? backHalf : interior).map((n) => n.id);
  const shuffled = next(Rand.shuffle(pickFrom));
  for (let i = 0; i < Math.min(m, shuffled.length); i++) bossIds.add(shuffled[i] as string);

  // 4. content helpers (deterministic difficulty by layer; RNG only picks within a band).
  const sortedEnemies = [...deps.enemyPool].sort((a, b) => a.maxHp - b.maxHp);
  const sortedBosses = [...deps.bossPool].sort((a, b) => a.maxHp - b.maxHp);
  if (sortedBosses.length === 0)
    throw new Error('level generation requires at least one boss in bossPool');

  const pickEnemies = (layer: number): readonly EnemyDefinition[] => {
    if (sortedEnemies.length === 0) return [];
    const count = clamp(
      Math.round(1 + (params.difficultyScaling - 1) * (layer - 1)),
      1,
      deps.maxEnemiesPerNode,
    );
    const bandStart = Math.min(sortedEnemies.length - 1, layer - 1);
    return Array.from(
      { length: count },
      () =>
        sortedEnemies[
          bandStart + next(Rand.nextInt(sortedEnemies.length - bandStart))
        ] as EnemyDefinition,
    );
  };
  const pickBoss = (layer: number, isEnd: boolean): EnemyDefinition => {
    const idx = isEnd
      ? sortedBosses.length - 1
      : Math.min(
          sortedBosses.length - 1,
          Math.floor((layer / (k - 1)) * (sortedBosses.length - 1)),
        );
    return sortedBosses[idx] as EnemyDefinition;
  };
  const pickContentKind = (): 'combat' | 'loot' | 'question' => {
    const w = params.nodeWeights;
    const total = w.combat + w.loot + w.question;
    if (total <= 0) return 'combat';
    const roll = next(Rand.nextInt(total));
    if (roll < w.combat) return 'combat';
    return roll < w.combat + w.loot ? 'loot' : 'question';
  };

  // 5. assign content to every node.
  const nodes = new Map<string, LevelNode>();
  for (let layer = 0; layer < k; layer++) {
    for (const id of layers[layer] as readonly string[]) {
      if (id === startId) {
        nodes.set(id, { id, type: NodeType.Start, layer, visited: false });
        continue;
      }
      if (bossIds.has(id)) {
        const isEnd = id === endId;
        const content: NodeContent = {
          kind: 'boss',
          boss: pickBoss(layer, isEnd),
          specialLoot: isEnd,
        };
        nodes.set(id, { id, type: NodeType.Boss, layer, content, visited: false });
        continue;
      }
      const kind = pickContentKind();
      if (kind === 'combat') {
        nodes.set(id, {
          id,
          type: NodeType.Combat,
          layer,
          content: { kind: 'combat', enemies: pickEnemies(layer) },
          visited: false,
        });
      } else if (kind === 'loot') {
        const [reward, s] = deps.rollChestLoot(seed);
        seed = s;
        nodes.set(id, {
          id,
          type: NodeType.Loot,
          layer,
          content: { kind: 'loot', reward },
          visited: false,
        });
      } else {
        const [question, s] = deps.rollQuestion(seed);
        seed = s;
        nodes.set(id, {
          id,
          type: NodeType.Question,
          layer,
          content: { kind: 'question', question },
          visited: false,
        });
      }
    }
  }

  const graph: LevelGraph = { nodes, edges, startId, endId, layerCount: k, currentNodeId: startId };
  return [graph, seed];
}

/** Reachable node set from `from`, following edges forward (or reversed when `forward` is false). */
function reachable(graph: LevelGraph, from: string, forward: boolean): Set<string> {
  const adj = new Map<string, string[]>();
  for (const e of graph.edges) {
    const key = forward ? e.from : e.to;
    const val = forward ? e.to : e.from;
    const list = adj.get(key);
    if (list === undefined) adj.set(key, [val]);
    else list.push(val);
  }
  const seen = new Set<string>([from]);
  const stack = [from];
  while (stack.length > 0) {
    const cur = stack.pop() as string;
    for (const nb of adj.get(cur) ?? []) {
      if (!seen.has(nb)) {
        seen.add(nb);
        stack.push(nb);
      }
    }
  }
  return seen;
}

/** Validate the graph: full connectivity both ways, structural uniqueness, ≥1 combat node. */
export function validate(graph: LevelGraph): boolean {
  const total = graph.nodes.size;
  if (reachable(graph, graph.startId, true).size !== total) return false; // no orphans/unreachable
  if (reachable(graph, graph.endId, false).size !== total) return false; // no dead-ends
  const all = [...graph.nodes.values()];
  if (all.filter((n) => n.type === NodeType.Start).length !== 1) return false;
  const start = graph.nodes.get(graph.startId);
  const end = graph.nodes.get(graph.endId);
  if (start === undefined || start.type !== NodeType.Start) return false;
  if (end === undefined || end.type !== NodeType.Boss) return false;
  const interior = all.filter((n) => n.id !== graph.startId && n.type !== NodeType.Boss);
  return interior.length === 0 || interior.some((n) => n.type === NodeType.Combat);
}

/**
 * Generate a validated level. Retries up to `deps.maxRetries` times, resuming the advancing
 * RNG stream each attempt (so the result is fully determined by `seed`), and throws if the
 * invariants can't be met — a content/param bug, never user input.
 */
export function generateLevel(
  params: GenerationParams,
  deps: LevelGenDeps,
  seed: Seed,
): LevelGraph {
  let s = seed;
  for (let attempt = 0; attempt <= deps.maxRetries; attempt++) {
    const [graph, advanced] = buildGraph(params, deps, s);
    if (validate(graph)) return graph;
    s = advanced;
  }
  throw new Error(`level generation failed to satisfy invariants after ${deps.maxRetries} retries`);
}
