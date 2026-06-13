import { NodeType } from '../../../model';
import type { EnemyDefinition, GenerationParams, LevelGraph } from '../../../model';
import { seedFrom } from '../../../rng/rng';
import type { Seed } from '../../../rng/rng';
import { generateLevel, validate } from '../levelGenerator';
import type { LevelGenDeps } from '../levelGenerator';

// --- Fixtures -------------------------------------------------------------

const enemy = (id: string, maxHp: number, isBoss = false): EnemyDefinition => ({
  id,
  name: id,
  maxHp,
  isBoss,
  intents: [{ kind: 'attack', value: 1 }],
});

// Stub rollers keep generator tests independent of the LootSystem; they only need to
// advance the seed deterministically and return a structurally-valid payload.
const stubChest = (seed: Seed) => [{ cards: [], isSpecial: false }, (seed + 1) | 0] as const;
const stubQuestion = (seed: Seed) =>
  [
    { text: 'q', options: [], correctIndex: 0, rewardOnCorrect: { cards: [], isSpecial: false } },
    (seed + 1) | 0,
  ] as const;

const params: GenerationParams = {
  layerCount: { min: 4, max: 6 },
  layerWidth: { min: 2, max: 4 },
  nodeWeights: { combat: 6, loot: 2, question: 2 },
  midBossCount: { min: 1, max: 2 },
  edgeDensity: 0.5,
  difficultyScaling: 1.2,
};

const deps: LevelGenDeps = {
  enemyPool: [
    enemy('bat', 6),
    enemy('slime', 8),
    enemy('goblin', 12),
    enemy('brute', 18),
    enemy('ogre', 26),
  ],
  bossPool: [enemy('warden', 40, true), enemy('overlord', 60, true)],
  rollChestLoot: stubChest,
  rollQuestion: stubQuestion,
  maxRetries: 8,
  maxEnemiesPerNode: 3,
};

const seeds = (n: number): Seed[] => Array.from({ length: n }, (_, i) => seedFrom(`seed${i}`));
const expectedEnemyCount = (layer: number): number =>
  Math.max(
    1,
    Math.min(deps.maxEnemiesPerNode, Math.round(1 + (params.difficultyScaling - 1) * (layer - 1))),
  );

// Independent reachability check (not reusing the generator's `validate`).
function reach(graph: LevelGraph, from: string, forward: boolean): Set<string> {
  const seen = new Set([from]);
  const stack = [from];
  while (stack.length > 0) {
    const cur = stack.pop() as string;
    for (const e of graph.edges) {
      const a = forward ? e.from : e.to;
      const b = forward ? e.to : e.from;
      if (a === cur && !seen.has(b)) {
        seen.add(b);
        stack.push(b);
      }
    }
  }
  return seen;
}

// --- Determinism ----------------------------------------------------------

describe('generateLevel determinism', () => {
  it('produces an identical graph for the same seed', () => {
    expect(generateLevel(params, deps, seedFrom('x'))).toEqual(
      generateLevel(params, deps, seedFrom('x')),
    );
  });

  it('produces different graphs across seeds', () => {
    const sig = (g: LevelGraph): string =>
      JSON.stringify({
        k: g.layerCount,
        nodes: [...g.nodes.values()].map((n) => `${n.id}:${n.type}`).sort(),
        edges: g.edges.map((e) => `${e.from}->${e.to}`).sort(),
      });
    const signatures = new Set(seeds(10).map((s) => sig(generateLevel(params, deps, s))));
    expect(signatures.size).toBeGreaterThan(1);
  });
});

// --- Structure ------------------------------------------------------------

describe('generateLevel structure', () => {
  it('has a single Start at L0N0 and a Boss end at the last layer', () => {
    const g = generateLevel(params, deps, seedFrom('struct'));
    expect(g.startId).toBe('L0N0');
    expect(g.endId).toBe(`L${g.layerCount - 1}N0`);
    expect([...g.nodes.values()].filter((n) => n.type === NodeType.Start)).toHaveLength(1);

    const start = g.nodes.get(g.startId);
    expect(start?.type).toBe(NodeType.Start);
    expect(start?.layer).toBe(0);
    expect(start?.content).toBeUndefined();

    const end = g.nodes.get(g.endId);
    expect(end?.type).toBe(NodeType.Boss);
    expect(end?.layer).toBe(g.layerCount - 1);
    expect(end?.content).toEqual(expect.objectContaining({ kind: 'boss', specialLoot: true }));
  });

  it('keeps layer count within bounds and start/end layers as singletons', () => {
    for (const s of seeds(20)) {
      const g = generateLevel(params, deps, s);
      expect(g.layerCount).toBeGreaterThanOrEqual(params.layerCount.min);
      expect(g.layerCount).toBeLessThanOrEqual(params.layerCount.max);
      const byLayer = (layer: number): number =>
        [...g.nodes.values()].filter((n) => n.layer === layer).length;
      expect(byLayer(0)).toBe(1);
      expect(byLayer(g.layerCount - 1)).toBe(1);
    }
  });

  it('places 1–2 mid-bosses (so 2–3 Boss nodes) with exactly one special-loot boss', () => {
    for (const s of seeds(20)) {
      const g = generateLevel(params, deps, s);
      const bosses = [...g.nodes.values()].filter((n) => n.type === NodeType.Boss);
      expect(bosses.length).toBeGreaterThanOrEqual(1 + params.midBossCount.min);
      expect(bosses.length).toBeLessThanOrEqual(1 + params.midBossCount.max);
      const special = bosses.filter((n) => n.content?.kind === 'boss' && n.content.specialLoot);
      expect(special).toHaveLength(1);
    }
  });
});

// --- Connectivity (DAG invariants) ---------------------------------------

describe('generateLevel connectivity', () => {
  it('every node is reachable from start and can reach end (no orphans, no dead-ends)', () => {
    for (const s of seeds(100)) {
      const g = generateLevel(params, deps, s);
      const total = g.nodes.size;
      expect(reach(g, g.startId, true).size).toBe(total);
      expect(reach(g, g.endId, false).size).toBe(total);
    }
  });

  it('edges run forward between adjacent layers only (acyclic by construction)', () => {
    for (const s of seeds(50)) {
      const g = generateLevel(params, deps, s);
      for (const e of g.edges) {
        const from = g.nodes.get(e.from);
        const to = g.nodes.get(e.to);
        expect((from?.layer ?? -1) + 1).toBe(to?.layer);
      }
    }
  });
});

// --- Content --------------------------------------------------------------

describe('generateLevel content', () => {
  it('Combat is the plurality interior type, and loot + questions both appear in the corpus', () => {
    const counts = { Combat: 0, Loot: 0, Question: 0 };
    for (const s of seeds(60)) {
      const g = generateLevel(params, deps, s);
      for (const n of g.nodes.values()) {
        if (n.id === g.startId || n.type === NodeType.Boss) continue;
        if (n.type === NodeType.Combat) counts.Combat++;
        if (n.type === NodeType.Loot) counts.Loot++;
        if (n.type === NodeType.Question) counts.Question++;
      }
    }
    expect(counts.Combat).toBeGreaterThan(counts.Loot);
    expect(counts.Combat).toBeGreaterThan(counts.Question);
    expect(counts.Loot).toBeGreaterThan(0);
    expect(counts.Question).toBeGreaterThan(0);
  });

  it('scales combat enemy count deterministically by layer', () => {
    for (const s of seeds(40)) {
      const g = generateLevel(params, deps, s);
      for (const n of g.nodes.values()) {
        if (n.type === NodeType.Combat && n.content?.kind === 'combat') {
          expect(n.content.enemies).toHaveLength(expectedEnemyCount(n.layer));
        }
      }
    }
  });
});

// --- Validation, retries, and edge cases ----------------------------------

describe('generateLevel validation & retries', () => {
  it('throws when the balance invariant can never be met (no combat allowed)', () => {
    const noCombat: GenerationParams = {
      ...params,
      nodeWeights: { combat: 0, loot: 1, question: 1 },
    };
    expect(() => generateLevel(noCombat, { ...deps, maxRetries: 2 }, seedFrom('nope'))).toThrow(
      /invariants/,
    );
  });

  it('throws when the boss pool is empty', () => {
    expect(() => generateLevel(params, { ...deps, bossPool: [] }, seedFrom('nobossz'))).toThrow(
      /boss/,
    );
  });

  it('fills combat nodes with no enemies when the enemy pool is empty (still valid)', () => {
    const g = generateLevel(params, { ...deps, enemyPool: [] }, seedFrom('noenemy'));
    const combats = [...g.nodes.values()].filter((n) => n.type === NodeType.Combat);
    expect(combats.length).toBeGreaterThan(0);
    for (const n of combats) expect(n.content).toEqual({ kind: 'combat', enemies: [] });
  });

  it('treats an all-zero node-weight level as all-combat interior (valid)', () => {
    const allCombat: GenerationParams = {
      ...params,
      nodeWeights: { combat: 0, loot: 0, question: 0 },
    };
    const g = generateLevel(allCombat, deps, seedFrom('zero'));
    const interior = [...g.nodes.values()].filter(
      (n) => n.id !== g.startId && n.type !== NodeType.Boss,
    );
    expect(interior.length).toBeGreaterThan(0);
    expect(interior.every((n) => n.type === NodeType.Combat)).toBe(true);
  });

  it('validate() rejects a graph with an unreachable node', () => {
    const g = generateLevel(params, deps, seedFrom('valid'));
    const orphan = {
      ...g,
      nodes: new Map([
        ...g.nodes,
        ['ORPHAN', { id: 'ORPHAN', type: NodeType.Loot, layer: 1, visited: false }],
      ]),
    };
    expect(validate(orphan)).toBe(false);
  });

  it('validate() rejects a graph with a node that cannot reach the end (dead-end)', () => {
    const g = generateLevel(params, deps, seedFrom('valid'));
    // 'DEAD' is reachable from start but has no outgoing edge, so it cannot reach the end.
    const dead = {
      ...g,
      nodes: new Map([
        ...g.nodes,
        ['DEAD', { id: 'DEAD', type: NodeType.Loot, layer: 1, visited: false }],
      ]),
      edges: [...g.edges, { from: g.startId, to: 'DEAD' }],
    };
    expect(validate(dead)).toBe(false);
  });

  it('validate() rejects a graph whose end node is not a Boss', () => {
    const g = generateLevel(params, deps, seedFrom('valid'));
    const end = g.nodes.get(g.endId);
    if (end === undefined) throw new Error('fixture: missing end node');
    const notBoss = {
      ...g,
      nodes: new Map([...g.nodes, [g.endId, { ...end, type: NodeType.Loot }]]),
    };
    expect(validate(notBoss)).toBe(false);
  });
});
