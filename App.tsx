import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createDefaultGameStore } from './src/store';
import { createPersistence } from './src/persistence';
import { MmkvKeyValueStore } from './src/persistence/mmkvStore';
import { GameStoreProvider } from './src/ui/store/GameStoreContext';
import { AppNavigator } from './src/ui/navigation/AppNavigator';

// The single production store, hydrated from MMKV (the only native import in the app shell).
const store = createDefaultGameStore(createPersistence(new MmkvKeyValueStore()), 'boot');

/**
 * App root: gesture/safe-area/navigation/store providers around the stack navigator. Screens read
 * the store via the `useGameStore` hook (context), so they stay decoupled from MMKV and testable.
 */
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <GameStoreProvider store={store}>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </GameStoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
