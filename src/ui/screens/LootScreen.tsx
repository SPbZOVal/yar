import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCardDef } from '../../domain/registry/cardRegistry';
import { selectCurrentNode } from '../../store';
import { useGameStore } from '../store/GameStoreContext';
import { Button } from '../components/Button';
import { colors } from '../theme';

/** Chest screen: shows the node's pre-rolled reward and collects it (→ back to the level map). */
export function LootScreen() {
  const node = useGameStore(selectCurrentNode);
  const dispatch = useGameStore((s) => s.dispatch);
  const reward = node?.content?.kind === 'loot' ? node.content.reward : undefined;

  const items: string[] = [];
  for (const c of reward?.cards ?? []) items.push(getCardDef(c.id).name);
  if (reward?.weapon) items.push(`⚔ ${reward.weapon.name}`);
  if (reward?.armor) items.push(`🛡 ${reward.armor.name}`);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Сундук</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>Пусто</Text>
      ) : (
        items.map((label, i) => (
          <Text key={i} style={styles.item}>
            {label}
          </Text>
        ))
      )}
      <View style={styles.spacer} />
      <Button
        testID="collect-loot"
        label="Забрать"
        onPress={() => reward && dispatch({ type: 'CollectLoot', reward })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, alignItems: 'center' },
  title: { fontSize: 28, color: colors.text, fontWeight: '700', marginVertical: 24 },
  item: { fontSize: 18, color: colors.text, marginVertical: 4 },
  empty: { fontSize: 16, color: colors.textDim, marginVertical: 8 },
  spacer: { flex: 1 },
});
