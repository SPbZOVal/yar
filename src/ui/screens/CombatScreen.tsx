import { useState } from 'react';
import { View, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Canvas,
  Group,
  RoundedRect,
  Text as SkiaText,
  matchFont,
} from '@shopify/react-native-skia';
import { CombatPhase, TargetType } from '../../domain/model';
import type { CombatantRef } from '../../domain/model';
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

/**
 * Combat board (Skia) + RN overlay touch. Enemies/player/hand are drawn in a Canvas; transparent
 * Pressables over the cards/enemies dispatch `PlayCard` (Self/no-target cards play immediately,
 * Targets cards wait for an enemy tap). End Turn → `EndTurn`; on a terminal phase, Continue →
 * `ResolveCombat`.
 *
 * Known limitation: a multi-target card (e.g. cleave) hits the single tapped enemy — a future
 * `targeting: 'one' | 'all'` card field would drive AoE.
 */
export function CombatScreen() {
  const { height } = useWindowDimensions();
  const combat = useGameStore(selectCombat);
  const dispatchCombat = useGameStore((s) => s.dispatchCombat);
  const dispatch = useGameStore((s) => s.dispatch);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  if (combat === null) return <SafeAreaView style={styles.container} />;

  const player = combat.player;
  const enemyY = 64;
  const handY = height - CARD_H - 96;

  const needsTarget = (defId: string): boolean =>
    getCardDef(defId).effects.some(
      (e) => e.kind === 'ApplyStatus' && e.target === TargetType.Targets,
    );

  const play = (instanceId: string, targets: readonly CombatantRef[]): void => {
    dispatchCombat({ type: 'PlayCard', instanceId, source: { side: 'player' }, targets });
    setSelectedCard(null);
  };
  const onCard = (instanceId: string, defId: string): void => {
    if (needsTarget(defId)) setSelectedCard((cur) => (cur === instanceId ? null : instanceId));
    else play(instanceId, []);
  };
  const onEnemy = (index: number): void => {
    if (selectedCard !== null) play(selectedCard, [{ side: 'enemy', index }]);
  };

  const enemyX = (i: number): number => PAD + i * (ENEMY_W + PAD);
  const cardX = (i: number): number => PAD + i * (CARD_W + PAD);
  const isOver = combat.phase === CombatPhase.Victory || combat.phase === CombatPhase.Defeat;

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
                y={enemyY}
                width={ENEMY_W}
                height={ENEMY_H}
                r={8}
                color={colors.surface}
              />
              <SkiaText
                x={enemyX(i) + 8}
                y={enemyY + 20}
                text={def.name}
                font={font}
                color={colors.text}
              />
              <SkiaText
                x={enemyX(i) + 8}
                y={enemyY + 40}
                text={`HP ${enemy.entity.hp}/${deriveMaxHp(enemy.entity)}`}
                font={small}
                color={colors.hp}
              />
              <SkiaText
                x={enemyX(i) + 8}
                y={enemyY + 60}
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
        {/* Hand */}
        {combat.hand.map((card, i) => {
          const def = getCardDef(card.defId);
          const selected = selectedCard === card.instanceId;
          return (
            <Group key={card.instanceId}>
              <RoundedRect
                x={cardX(i)}
                y={handY}
                width={CARD_W}
                height={CARD_H}
                r={10}
                color={selected ? colors.primary : colors.surface}
              />
              <SkiaText
                x={cardX(i) + 8}
                y={handY + 22}
                text={def.name}
                font={small}
                color={colors.text}
              />
              <SkiaText
                x={cardX(i) + 8}
                y={handY + CARD_H - 12}
                text={`⚡${def.cost}`}
                font={small}
                color={colors.energy}
              />
            </Group>
          );
        })}
      </Canvas>

      {/* Touch overlay */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {combat.enemies.map((enemy, i) =>
          enemy.entity.hp > 0 ? (
            <Pressable
              key={i}
              testID={`enemy-${i}`}
              onPress={() => onEnemy(i)}
              style={[
                styles.hit,
                { left: enemyX(i), top: enemyY, width: ENEMY_W, height: ENEMY_H },
              ]}
            />
          ) : null,
        )}
        {combat.hand.map((card, i) => (
          <Pressable
            key={card.instanceId}
            testID={`card-${card.instanceId}`}
            onPress={() => onCard(card.instanceId, card.defId)}
            style={[styles.hit, { left: cardX(i), top: handY, width: CARD_W, height: CARD_H }]}
          />
        ))}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hit: { position: 'absolute' },
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
});
