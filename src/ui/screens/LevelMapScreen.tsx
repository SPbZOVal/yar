import { useMemo } from 'react';
import { View, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Canvas,
  Circle,
  Group,
  Line,
  Text as SkiaText,
  matchFont,
} from '@shopify/react-native-skia';
import type { LevelEdge, LevelNode } from '../../domain/model';
import { selectLevel } from '../../store';
import { useGameStore } from '../store/GameStoreContext';
import { colors, nodeColor } from '../theme';

const R = 22;
const font = matchFont({ fontFamily: 'sans-serif', fontSize: 12 });
const NO_EDGES: readonly LevelEdge[] = [];

/**
 * Level map (Skia): k-partite graph laid out by (layer, index). Edges are drawn lines, nodes are
 * circles colored by type (visited dimmed, current outlined). Reachable nodes get a transparent
 * overlay Pressable → `EnterNode`. (Skia draws; RN handles touch — same pattern as combat.)
 */
export function LevelMapScreen() {
  const { width, height } = useWindowDimensions();
  // Select the stable `level` ref and derive arrays with useMemo — array-allocating selectors
  // would make zustand's useSyncExternalStore loop ("getSnapshot should be cached").
  const level = useGameStore(selectLevel);
  const dispatch = useGameStore((s) => s.dispatch);

  const nodes = useMemo(() => (level === null ? [] : [...level.nodes.values()]), [level]);
  const edges = level?.edges ?? NO_EDGES;
  const reachableSet = useMemo(
    () =>
      new Set(
        level === null
          ? []
          : level.edges.filter((e) => e.from === level.currentNodeId).map((e) => e.to),
      ),
    [level],
  );

  const layout = useMemo(() => {
    const layers = Math.max(level?.layerCount ?? 1, 1);
    const h = Math.max(height - 160, 240);
    const colW = width / layers;
    const byLayer = new Map<number, LevelNode[]>();
    for (const n of nodes) byLayer.set(n.layer, [...(byLayer.get(n.layer) ?? []), n]);
    const pos = new Map<string, { x: number; y: number }>();
    for (const [layer, list] of byLayer) {
      list.forEach((n, idx) => {
        pos.set(n.id, { x: colW * (layer + 0.5), y: (h / (list.length + 1)) * (idx + 1) + 60 });
      });
    }
    return pos;
  }, [nodes, level, width, height]);

  return (
    <SafeAreaView style={styles.container}>
      <Canvas style={StyleSheet.absoluteFill}>
        {edges.map((e, i) => {
          const a = layout.get(e.from);
          const b = layout.get(e.to);
          return a && b ? (
            <Line key={i} p1={a} p2={b} color={colors.surfaceAlt} strokeWidth={2} />
          ) : null;
        })}
        {nodes.map((n) => {
          const p = layout.get(n.id);
          if (p === undefined) return null;
          return (
            <Group key={n.id}>
              {n.id === level?.currentNodeId && (
                <Circle cx={p.x} cy={p.y} r={R + 4} color={colors.text} />
              )}
              <Circle
                cx={p.x}
                cy={p.y}
                r={R}
                color={nodeColor[n.type] ?? colors.surfaceAlt}
                opacity={n.visited ? 0.4 : 1}
              />
              <SkiaText
                x={p.x - 4}
                y={p.y + 5}
                text={n.type[0] ?? '?'}
                font={font}
                color={colors.text}
              />
            </Group>
          );
        })}
      </Canvas>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {nodes.map((n) => {
          const p = layout.get(n.id);
          if (p === undefined || !reachableSet.has(n.id)) return null;
          return (
            <Pressable
              key={n.id}
              testID={`node-${n.id}`}
              accessibilityRole="button"
              onPress={() => dispatch({ type: 'EnterNode', nodeId: n.id })}
              style={[styles.hit, { left: p.x - R, top: p.y - R }]}
            />
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hit: { position: 'absolute', width: R * 2, height: R * 2, borderRadius: R },
});
