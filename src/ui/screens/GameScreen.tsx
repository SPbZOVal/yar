import { selectScreen } from '../../store';
import { useGameStore } from '../store/GameStoreContext';
import { DeckBuildingScreen } from './DeckBuildingScreen';
import { LevelMapScreen } from './LevelMapScreen';
import { CombatScreen } from './CombatScreen';
import { CutsceneScreen } from './CutsceneScreen';
import { LootScreen } from './LootScreen';
import { QuestionScreen } from './QuestionScreen';
import { LevelClearedScreen } from './LevelClearedScreen';
import { DeathScreen } from './DeathScreen';

/**
 * In-run router: renders the sub-screen for the current domain `run.screen`. Content-less nodes
 * (`node:*`) just advanced the player on the map, so the default falls back to the level map.
 */
export function GameScreen() {
  const screen = useGameStore(selectScreen);

  switch (screen) {
    case 'cutscene':
      return <CutsceneScreen />;
    case 'deckBuilding':
      return <DeckBuildingScreen />;
    case 'combat':
      return <CombatScreen />;
    case 'loot':
      return <LootScreen />;
    case 'question':
      return <QuestionScreen />;
    case 'levelCleared':
      return <LevelClearedScreen />;
    case 'death':
      return <DeathScreen />;
    case 'level':
    default:
      return <LevelMapScreen />;
  }
}
