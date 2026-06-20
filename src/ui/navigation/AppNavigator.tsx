/**
 * Root navigation: a native stack of MainMenu → Game. In-run sub-screens (deck-building,
 * level map, combat, …) are switched inside GameScreen by the domain `run.screen`, so the
 * native stack stays small and the domain drives what's shown during a run.
 */
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainMenuScreen } from '../screens/MainMenuScreen';
import { GameScreen } from '../screens/GameScreen';

export type RootStackParamList = {
  MainMenu: undefined;
  Game: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="MainMenu" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainMenu" component={MainMenuScreen} />
      <Stack.Screen name="Game" component={GameScreen} />
    </Stack.Navigator>
  );
}
