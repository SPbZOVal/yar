import { Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useGameStore } from '../store/GameStoreContext';

type Props = NativeStackScreenProps<RootStackParamList, 'MainMenu'>;

/** Main menu: start a fresh run (keeps the persisted collection) or continue the current one. */
export function MainMenuScreen({ navigation }: Props) {
  const newRun = useGameStore((s) => s.newRun);

  const startNewRun = () => {
    newRun(`run-${Date.now()}`); // app-layer seed (the domain stays deterministic per seed)
    navigation.navigate('Game');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🃏 Yar</Text>
      <Text style={styles.subtitle}>Yet Another Rogue</Text>
      <Pressable testID="new-run" style={styles.button} onPress={startNewRun}>
        <Text style={styles.buttonText}>Новый забег</Text>
      </Pressable>
      <Pressable
        testID="continue"
        style={styles.buttonSecondary}
        onPress={() => navigation.navigate('Game')}
      >
        <Text style={styles.buttonText}>Продолжить</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#11131a',
  },
  title: { fontSize: 48, color: '#f4f4f5', fontWeight: '700' },
  subtitle: { fontSize: 16, color: '#9ca3af', marginBottom: 48 },
  button: {
    backgroundColor: '#6d28d9',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginVertical: 8,
  },
  buttonSecondary: {
    backgroundColor: '#374151',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginVertical: 8,
  },
  buttonText: { color: '#f4f4f5', fontSize: 18, fontWeight: '600' },
});
