import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Cutscene } from '../../domain/model';
import { getCutscene } from '../../domain/content/cutscenes';
import { selectCutscene } from '../../store';
import { useGameStore } from '../store/GameStoreContext';
import { DialogueBox } from '../components/DialogueBox';
import { colors } from '../theme';

/** Placeholder "portraits" (no art assets yet) + speaker per beat (empty = narration, no nameplate). */
const BEAT: Record<Cutscene, { portrait: string; speaker: string }> = {
  [Cutscene.Intro]: { portrait: '🃏', speaker: '' },
  [Cutscene.PreBoss]: { portrait: '👹', speaker: 'Хозяин уровня' },
  [Cutscene.PostBoss]: { portrait: '🏆', speaker: '' },
};

/**
 * Visual-novel cutscene: a character portrait over a dialogue box that types each line out. Tapping
 * the box pages through the beat's lines; the last line — or the "Пропустить" skip — dispatches
 * `DismissCutscene`, which the run reducer routes to whatever the beat gated (deck-building / the
 * staged boss fight / the level-cleared screen).
 */
export function CutsceneScreen() {
  const beat = useGameStore(selectCutscene);
  const dispatch = useGameStore((s) => s.dispatch);
  const [page, setPage] = useState(0);

  if (beat === undefined) return <SafeAreaView style={styles.container} />;

  const lines = getCutscene(beat);
  const meta = BEAT[beat];
  const dismiss = (): void => dispatch({ type: 'DismissCutscene' });
  const advance = (): void => (page + 1 < lines.length ? setPage(page + 1) : dismiss());

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.scene}>
        <Text style={styles.portrait}>{meta.portrait}</Text>
      </View>
      <Pressable testID="cutscene-advance" style={styles.skip} onPress={dismiss}>
        <Text style={styles.skipText}>Пропустить ▷▷</Text>
      </Pressable>
      <DialogueBox speaker={meta.speaker} text={lines[page] ?? ''} onAdvance={advance} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scene: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  portrait: { fontSize: 110 },
  skip: { position: 'absolute', top: 12, right: 16, padding: 8 },
  skipText: { color: colors.textDim, fontSize: 14 },
});
