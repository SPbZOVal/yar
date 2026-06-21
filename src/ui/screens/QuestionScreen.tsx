import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { selectCurrentNode } from '../../store';
import { useGameStore } from '../store/GameStoreContext';
import { Button } from '../components/Button';
import { DialogueBox } from '../components/DialogueBox';
import { colors } from '../theme';

/** The character who poses riddles on a question node (placeholder portrait until art exists). */
const SPHINX = { portrait: '🗿', name: 'Сфинкс' } as const;

/**
 * Question node as a visual-novel scene (landscape): the Sphinx stands at the right, just above the
 * dialogue block. The riddle types out in the box and the answer options appear as a 2×2 grid of
 * choices once the line is shown. A correct answer grants the reward (the reducer routes loot +
 * returns to the level map).
 */
export function QuestionScreen() {
  const node = useGameStore(selectCurrentNode);
  const dispatch = useGameStore((s) => s.dispatch);
  const question = node?.content?.kind === 'question' ? node.content.question : undefined;

  if (question === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.portraitRow}>
          <Text style={styles.portrait}>{SPHINX.portrait}</Text>
        </View>
        <DialogueBox speaker={SPHINX.name} text="Загадок больше нет." />
      </SafeAreaView>
    );
  }

  const choices = (
    <View style={styles.choices}>
      {question.options.map((option, index) => (
        <View key={index} style={styles.choiceCell}>
          <Button
            testID={`answer-${index}`}
            variant="secondary"
            label={option}
            onPress={() => dispatch({ type: 'AnswerQuestion', answerIndex: index })}
          />
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.portraitRow}>
        <Text style={styles.portrait}>{SPHINX.portrait}</Text>
      </View>
      <DialogueBox speaker={SPHINX.name} text={question.text} choices={choices} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Stack to the bottom: the Sphinx sits in the right part, just above the dialogue block.
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'flex-end' },
  portraitRow: { alignItems: 'flex-end', paddingRight: 96, paddingBottom: 4 },
  portrait: { fontSize: 128 },
  // 2×2 grid keeps the block short enough to leave the character visible above it.
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  choiceCell: { width: '49%' },
});
