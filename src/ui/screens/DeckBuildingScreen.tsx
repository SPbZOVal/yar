import { useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCardDef } from '../../domain/registry/cardRegistry';
import { selectCollection, selectPlayer } from '../../store';
import { useGameStore } from '../store/GameStoreContext';

/**
 * Deck-building (docs §9): pick up to `maxDeckSize` cards from the collection, optionally swap
 * weapon/armor from owned gear, then start the level. Pure dispatch — `BuildDeck` / `EquipWeapon`
 * / `EquipArmor` / `GenerateLevel` all land in the domain reducer; this screen only selects.
 */
export function DeckBuildingScreen() {
  const collection = useGameStore(selectCollection);
  const player = useGameStore(selectPlayer);
  const dispatch = useGameStore((s) => s.dispatch);
  const maxDeckSize = useGameStore((s) => s.run.runDeck.maxDeckSize);

  const [selected, setSelected] = useState<readonly string[]>([]);

  const toggle = (id: string): void =>
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      return cur.length < maxDeckSize ? [...cur, id] : cur;
    });

  const start = (): void => {
    dispatch({ type: 'BuildDeck', cardInstanceIds: selected });
    dispatch({ type: 'GenerateLevel' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
        Колода {selected.length}/{maxDeckSize}
      </Text>

      <FlatList
        data={collection.ownedCards}
        keyExtractor={(c) => c.instanceId}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Коллекция пуста</Text>}
        renderItem={({ item }) => {
          const def = getCardDef(item.defId);
          const on = selected.includes(item.instanceId);
          return (
            <Pressable
              testID={`card-${item.instanceId}`}
              style={[styles.card, on && styles.cardOn]}
              onPress={() => toggle(item.instanceId)}
            >
              <Text style={styles.cardName}>{def.name}</Text>
              <Text style={styles.cardDesc}>{def.description}</Text>
            </Pressable>
          );
        }}
      />

      <View style={styles.gear}>
        <Text style={styles.gearText}>⚔ {player.weapon.name}</Text>
        <Text style={styles.gearText}>🛡 {player.armor.name}</Text>
      </View>
      {collection.ownedWeapons.map((w) => (
        <Pressable
          key={w.id}
          style={styles.gearOption}
          onPress={() => dispatch({ type: 'EquipWeapon', weaponId: w.id })}
        >
          <Text style={styles.gearText}>Надеть: {w.name}</Text>
        </Pressable>
      ))}
      {collection.ownedArmor.map((a) => (
        <Pressable
          key={a.id}
          style={styles.gearOption}
          onPress={() => dispatch({ type: 'EquipArmor', armorId: a.id })}
        >
          <Text style={styles.gearText}>Надеть: {a.name}</Text>
        </Pressable>
      ))}

      <Pressable
        testID="go"
        style={[styles.button, selected.length === 0 && styles.buttonDisabled]}
        disabled={selected.length === 0}
        onPress={start}
      >
        <Text style={styles.buttonText}>В путь</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#11131a', paddingHorizontal: 16 },
  title: { fontSize: 24, color: '#f4f4f5', fontWeight: '700', marginVertical: 16 },
  list: { paddingBottom: 16 },
  empty: { color: '#9ca3af', textAlign: 'center', marginTop: 32 },
  card: { backgroundColor: '#1f2230', borderRadius: 10, padding: 12, marginVertical: 4 },
  cardOn: { borderWidth: 2, borderColor: '#6d28d9' },
  cardName: { color: '#f4f4f5', fontSize: 16, fontWeight: '600' },
  cardDesc: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
  gear: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  gearOption: { backgroundColor: '#1f2230', borderRadius: 8, padding: 8, marginVertical: 2 },
  gearText: { color: '#e5e7eb', fontSize: 14 },
  button: {
    backgroundColor: '#6d28d9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 12,
  },
  buttonDisabled: { backgroundColor: '#374151' },
  buttonText: { color: '#f4f4f5', fontSize: 18, fontWeight: '600' },
});
