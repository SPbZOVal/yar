import { useEffect, useRef, useState } from 'react';
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Canvas,
  Group,
  RoundedRect,
  Text as SkiaText,
  matchFont,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { CombatPhase, Targeting, TargetType } from '../../domain/model';
import type { CardDefinition, CombatantRef } from '../../domain/model';
import { getCardDef } from '../../domain/registry/cardRegistry';
import { getEnemyDef } from '../../domain/registry/enemyRegistry';
import { block as deriveBlock, maxHp as deriveMaxHp } from '../../domain/entity/entity';
import { selectCombat } from '../../store';
import { useGameStore } from '../store/GameStoreContext';
import { Button } from '../components/Button';
import { colors } from '../theme';

const font = matchFont({ fontFamily: 'sans-serif', fontSize: 13 });
const small = matchFont({ fontFamily: 'sans-serif', fontSize: 11 });

const ENEMY_W = 104;
const ENEMY_H = 76;
const CARD_W = 92;
const CARD_H = 120;
const PAD = 12;
const ENEMY_Y = 64;

const enemyX = (i: number): number => PAD + i * (ENEMY_W + PAD);
const cardX = (i: number): number => PAD + i * (CARD_W + PAD);

/** A point is on an enemy if it falls inside that enemy's drawn box (overlay-relative coords). */
function enemyBoxContains(i: number, x: number, y: number): boolean {
  return x >= enemyX(i) && x <= enemyX(i) + ENEMY_W && y >= ENEMY_Y && y <= ENEMY_Y + ENEMY_H;
}

/** A card needs the player to pick one enemy: single-target AND it has an enemy-directed effect. */
function needsEnemyTarget(def: CardDefinition): boolean {
  return (
    def.targeting === Targeting.One &&
    def.effects.some((e) => e.kind === 'ApplyStatus' && e.target === TargetType.Targets)
  );
}

interface DraggableCardProps {
  readonly instanceId: string;
  readonly def: CardDefinition;
  readonly index: number;
  readonly baseY: number;
  readonly selected: boolean;
  readonly onTap: () => void;
  /** Released after a real upward drag, at overlay-relative point (x, y). */
  readonly onDrop: (x: number, y: number) => void;
}

/**
 * One hand card, rendered in RN (not Skia) so it can be dragged and animated. A `Pan` gesture
 * moves the card with the finger and, on release above the hand, calls `onDrop` with the card's
 * centre so the screen can resolve a target; otherwise it springs back. A transparent `Pressable`
 * keeps the tap-to-select path (and its `testID`) working — drag is additive, not a replacement.
 */
function DraggableCard({
  instanceId,
  def,
  index,
  baseY,
  selected,
  onTap,
  onDrop,
}: DraggableCardProps) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);

  const baseX = cardX(index);
  const reset = (): void => {
    'worklet';
    tx.value = withSpring(0);
    ty.value = withSpring(0);
    scale.value = withSpring(1);
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      scale.value = withSpring(1.12);
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      const centreX = baseX + CARD_W / 2 + e.translationX;
      const centreY = baseY + CARD_H / 2 + e.translationY;
      // Only a meaningful upward drag (card lifted above the hand) counts as a play; a tap in
      // place is left to the Pressable below.
      if (centreY < baseY) runOnJS(onDrop)(centreX, centreY);
      reset();
    });

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.card, { left: baseX, top: baseY }, selected && styles.cardSelected, aStyle]}
      >
        <Text style={styles.cardName} numberOfLines={2}>
          {def.name}
        </Text>
        <Text style={styles.cardCost}>⚡{def.cost}</Text>
        <Pressable testID={`card-${instanceId}`} onPress={onTap} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * A red pulse that fires whenever `hp` drops between renders — the combat hit-flash. Rendered as a
 * touch-transparent RN overlay above the Skia canvas (Skia props can't be driven by Reanimated
 * here, and the jest mocks make these no-ops), positioned by the caller's `style` box. Tracks the
 * previous hp in a ref so a lethal hit (hp → 0) still flashes. Animation timing is verified
 * on-device; under jest the mock collapses the sequence to opacity 0 (nothing to assert).
 */
function HitFlash({
  hp,
  style,
  color = colors.hp,
  testID,
}: {
  readonly hp: number;
  readonly style: StyleProp<ViewStyle>;
  readonly color?: string;
  readonly testID?: string;
}) {
  const prev = useRef(hp);
  const opacity = useSharedValue(0);
  useEffect(() => {
    if (hp < prev.current) {
      opacity.value = withSequence(
        withTiming(0.55, { duration: 90 }),
        withTiming(0, { duration: 240 }),
      );
    }
    prev.current = hp;
  }, [hp, opacity]);
  const aStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      testID={testID}
      style={[styles.flash, { backgroundColor: color }, style, aStyle]}
    />
  );
}

/** A full-screen red wash that pulses when the player loses HP (the "you got hit" feedback). */
function ScreenHurtFlash({ hp }: { readonly hp: number }) {
  const prev = useRef(hp);
  const opacity = useSharedValue(0);
  useEffect(() => {
    if (hp < prev.current) {
      opacity.value = withSequence(
        withTiming(0.3, { duration: 110 }),
        withTiming(0, { duration: 320 }),
      );
    }
    prev.current = hp;
  }, [hp, opacity]);
  const aStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      testID="flash-player"
      style={[StyleSheet.absoluteFill, styles.hurt, aStyle]}
    />
  );
}

/**
 * Combat board: enemies/player drawn in Skia, the hand as draggable RN cards over it. A card is
 * played by dragging it onto an enemy (single-target) or anywhere above the hand (AoE/self), or by
 * tapping — tap an AoE/self card to play it, or tap a single-target card then tap an enemy. End
 * Turn → `EndTurn`; on a terminal phase, Continue → `ResolveCombat`. Damage is flashed by
 * `HitFlash` (per enemy) and `ScreenHurtFlash` (player) overlays.
 */
export function CombatScreen() {
  const { height } = useWindowDimensions();
  const combat = useGameStore(selectCombat);
  const dispatchCombat = useGameStore((s) => s.dispatchCombat);
  const dispatch = useGameStore((s) => s.dispatch);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  // Cards toggled in the scry selection overlay (combat.pendingSelection).
  const [picks, setPicks] = useState<readonly string[]>([]);

  if (combat === null) return <SafeAreaView style={styles.container} />;

  const player = combat.player;
  const handY = height - CARD_H - 96;

  const play = (instanceId: string, targets: readonly CombatantRef[]): void => {
    dispatchCombat({ type: 'PlayCard', instanceId, source: { side: 'player' }, targets });
    setSelectedCard(null);
  };

  // Tap: single-target cards select (then tap an enemy); AoE/self cards play immediately.
  const onCard = (instanceId: string, def: CardDefinition): void => {
    if (needsEnemyTarget(def)) setSelectedCard((cur) => (cur === instanceId ? null : instanceId));
    else play(instanceId, []);
  };
  const onEnemy = (index: number): void => {
    if (selectedCard !== null) play(selectedCard, [{ side: 'enemy', index }]);
  };

  // Drag-release: single-target cards must land on a living enemy; AoE/self play with no target.
  const onDrop = (instanceId: string, def: CardDefinition, x: number, y: number): void => {
    if (needsEnemyTarget(def)) {
      const hit = combat.enemies.findIndex((e, i) => e.entity.hp > 0 && enemyBoxContains(i, x, y));
      if (hit >= 0) play(instanceId, [{ side: 'enemy', index: hit }]);
    } else {
      play(instanceId, []);
    }
  };

  const isOver = combat.phase === CombatPhase.Victory || combat.phase === CombatPhase.Defeat;
  const pending = combat.pendingSelection;

  // Toggle a candidate in/out of the scry pick set.
  const togglePick = (id: string): void =>
    setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const confirmSelection = (): void => {
    dispatchCombat({ type: 'ResolveSelection', instanceIds: picks });
    setPicks([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Enemies */}
        {combat.enemies.map((enemy, i) => {
          const def = getEnemyDef(enemy.defId);
          const intent = def.intents[enemy.currentIntentIndex % Math.max(def.intents.length, 1)];
          const dead = enemy.entity.hp <= 0;
          return (
            <Group key={i} opacity={dead ? 0.3 : 1}>
              <RoundedRect
                x={enemyX(i)}
                y={ENEMY_Y}
                width={ENEMY_W}
                height={ENEMY_H}
                r={8}
                color={colors.surface}
              />
              <SkiaText
                x={enemyX(i) + 8}
                y={ENEMY_Y + 20}
                text={def.name}
                font={font}
                color={colors.text}
              />
              <SkiaText
                x={enemyX(i) + 8}
                y={ENEMY_Y + 40}
                text={`HP ${enemy.entity.hp}/${deriveMaxHp(enemy.entity)}`}
                font={small}
                color={colors.hp}
              />
              <SkiaText
                x={enemyX(i) + 8}
                y={ENEMY_Y + 60}
                text={intent ? `${intent.kind} ${intent.value}` : '—'}
                font={small}
                color={colors.textDim}
              />
            </Group>
          );
        })}
        {/* Player */}
        <SkiaText
          x={PAD}
          y={handY - 28}
          text={`Игрок  HP ${player.hp}/${deriveMaxHp(player)}  Блок ${deriveBlock(player)}  Энергия ${combat.energy}`}
          font={font}
          color={colors.text}
        />
      </Canvas>

      {/* Damage hit-flash overlays (cosmetic; mapped over ALL enemies so a lethal hit flashes too) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {combat.enemies.map((enemy, i) => (
          <HitFlash
            key={i}
            hp={enemy.entity.hp}
            testID={`flash-enemy-${i}`}
            style={{ left: enemyX(i), top: ENEMY_Y, width: ENEMY_W, height: ENEMY_H }}
          />
        ))}
      </View>
      <ScreenHurtFlash hp={player.hp} />

      {/* Enemy touch targets (tap-to-target fallback for the select-then-tap flow) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {combat.enemies.map((enemy, i) =>
          enemy.entity.hp > 0 ? (
            <Pressable
              key={i}
              testID={`enemy-${i}`}
              onPress={() => onEnemy(i)}
              style={[
                styles.hit,
                { left: enemyX(i), top: ENEMY_Y, width: ENEMY_W, height: ENEMY_H },
              ]}
            />
          ) : null,
        )}
      </View>

      {/* Hand: draggable RN cards */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {combat.hand.map((card, i) => {
          const def = getCardDef(card.defId);
          return (
            <DraggableCard
              key={card.instanceId}
              instanceId={card.instanceId}
              def={def}
              index={i}
              baseY={handY}
              selected={selectedCard === card.instanceId}
              onTap={() => onCard(card.instanceId, def)}
              onDrop={(x, y) => onDrop(card.instanceId, def, x, y)}
            />
          );
        })}
      </View>

      <View style={styles.endTurn}>
        <Button
          testID="end-turn"
          label="Конец хода"
          onPress={() => dispatchCombat({ type: 'EndTurn' })}
        />
      </View>

      {isOver && (
        <View style={styles.overlay}>
          <Button
            testID="resolve-combat"
            label={combat.phase === CombatPhase.Victory ? 'Победа — дальше' : 'Поражение'}
            variant={combat.phase === CombatPhase.Victory ? 'primary' : 'danger'}
            onPress={() => dispatch({ type: 'ResolveCombat' })}
          />
        </View>
      )}

      {/* Interactive scry: choose which revealed cards to take into hand. */}
      {pending !== undefined && (
        <View style={styles.overlay}>
          <Text style={styles.selectTitle}>Выберите карты в руку</Text>
          <View style={styles.selectRow}>
            {pending.candidateIds.map((id) => {
              const inst = combat.drawPile.find((c) => c.instanceId === id);
              const name = inst ? getCardDef(inst.defId).name : id;
              return (
                <Pressable
                  key={id}
                  testID={`select-${id}`}
                  onPress={() => togglePick(id)}
                  style={[styles.selectCard, picks.includes(id) && styles.cardSelected]}
                >
                  <Text style={styles.cardName} numberOfLines={3}>
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Button testID="confirm-selection" label="Готово" onPress={confirmSelection} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hit: { position: 'absolute' },
  card: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    borderRadius: 10,
    backgroundColor: colors.surface,
    padding: 8,
    justifyContent: 'space-between',
  },
  cardSelected: { borderWidth: 2, borderColor: colors.primary },
  cardName: { color: colors.text, fontSize: 11 },
  cardCost: { color: colors.energy, fontSize: 11 },
  endTurn: { position: 'absolute', right: PAD, bottom: PAD },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  flash: { position: 'absolute', borderRadius: 8 },
  hurt: { backgroundColor: colors.danger },
  selectTitle: { color: colors.text, fontSize: 16, marginBottom: PAD },
  selectRow: { flexDirection: 'row', gap: PAD, marginBottom: PAD },
  selectCard: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 10,
    backgroundColor: colors.surface,
    padding: 8,
    justifyContent: 'center',
  },
});
