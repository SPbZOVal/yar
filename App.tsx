import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/ui/navigation/AppNavigator';

/**
 * App root: gesture/safe-area/navigation providers around the stack navigator. The game store
 * is a module singleton (see src/ui/store/useGameStore) that hydrates persisted meta at import,
 * so there is no provider for it here — screens read it via the `useGameStore` hook.
 */
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
