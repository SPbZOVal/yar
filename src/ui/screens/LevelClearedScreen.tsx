import { Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore } from '../store/GameStoreContext';
import { Button } from '../components/Button';
import { colors } from '../theme';

/** Shown after the end boss falls: advance to the next (harder) level → deck-building. */
export function LevelClearedScreen() {
  const dispatch = useGameStore((s) => s.dispatch);
  const levelIndex = useGameStore((s) => s.run.levelIndex);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Уровень пройден!</Text>
      <Text style={styles.subtitle}>Босс повержен. Впереди — новый уровень.</Text>
      <Button
        testID="advance-level"
        label={`Уровень ${levelIndex + 2}`}
        onPress={() => dispatch({ type: 'AdvanceLevel' })}
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
  title: { fontSize: 30, color: colors.success, fontWeight: '700' },
  subtitle: { fontSize: 16, color: colors.textDim, marginVertical: 16, textAlign: 'center' },
});
