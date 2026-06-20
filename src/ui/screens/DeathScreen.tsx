import { Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore } from '../store/GameStoreContext';
import { Button } from '../components/Button';
import { colors } from '../theme';

/** Death screen: restart the run (OnPlayerDeath resets to deck-building; collection persists). */
export function DeathScreen() {
  const dispatch = useGameStore((s) => s.dispatch);
  const levelIndex = useGameStore((s) => s.run.levelIndex);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Поражение</Text>
      <Text style={styles.subtitle}>Ты пал на уровне {levelIndex + 1}. Коллекция сохранена.</Text>
      <Button
        testID="restart-run"
        variant="danger"
        label="Заново"
        onPress={() => dispatch({ type: 'OnPlayerDeath' })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 32, color: colors.hp, fontWeight: '700' },
  subtitle: { fontSize: 16, color: colors.textDim, marginVertical: 16, textAlign: 'center' },
});
