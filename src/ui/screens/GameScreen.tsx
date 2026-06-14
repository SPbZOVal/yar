import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { selectScreen } from '../../store';
import { useGameStore } from '../store/useGameStore';
import { DeckBuildingScreen } from './DeckBuildingScreen';

/**
 * In-run router: renders the sub-screen for the current domain `run.screen`. Only deck-building
 * is implemented so far; the level map / combat / loot / question screens (Skia) are the next PR
 * and show a placeholder for now.
 */
export function GameScreen() {
  const screen = useGameStore(selectScreen);

  if (screen === 'deckBuilding') return <DeckBuildingScreen />;

  return (
    <SafeAreaView style={styles.center}>
      <Text style={styles.text}>{`Экран «${screen}» скоро будет`}</Text>
      <Text style={styles.hint}>Следующий PR: карта уровня и бой (Skia)</Text>
      <View />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#11131a' },
  text: { fontSize: 20, color: '#f4f4f5' },
  hint: { fontSize: 14, color: '#9ca3af', marginTop: 8 },
});
