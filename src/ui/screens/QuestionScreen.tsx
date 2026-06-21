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
 * Question node as a visual-novel scene: the Sphinx character poses the riddle in the dialogue box
 * (typed out), and the answer options appear as choices once the line is shown. A correct answer
 * grants the reward (the reducer routes loot + returns to the level map).
 */
export function QuestionScreen() {
  const node = useGameStore(selectCurrentNode);
  const dispatch = useGameStore((s) => s.dispatch);
  const question = node?.content?.kind === 'question' ? node.content.question : undefined;

  if (question === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.scene}>
          <Text style={styles.portrait}>{SPHINX.portrait}</Text>
        </View>
        <DialogueBox speaker={SPHINX.name} text="Загадок больше нет." />
      </SafeAreaView>
    );
  }

  const choices = (
    <View style={styles.choices}>
      {question.options.map((option, index) => (
        <Button
          key={index}
          testID={`answer-${index}`}
          variant="secondary"
          label={option}
          onPress={() => dispatch({ type: 'AnswerQuestion', answerIndex: index })}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.scene}>
        <Text style={styles.portrait}>{SPHINX.portrait}</Text>
      </View>
      <DialogueBox speaker={SPHINX.name} text={question.text} choices={choices} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scene: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  portrait: { fontSize: 110 },
  choices: { marginTop: 10, gap: 2 },
});
