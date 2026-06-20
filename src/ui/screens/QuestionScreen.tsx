import { Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { selectCurrentNode } from '../../store';
import { useGameStore } from '../store/GameStoreContext';
import { Button } from '../components/Button';
import { colors } from '../theme';

/** Quiz screen: a correct answer grants the reward (reducer routes loot + back to level). */
export function QuestionScreen() {
  const node = useGameStore(selectCurrentNode);
  const dispatch = useGameStore((s) => s.dispatch);
  const question = node?.content?.kind === 'question' ? node.content.question : undefined;

  if (question === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.prompt}>Нет вопроса</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.prompt}>{question.text}</Text>
      {question.options.map((option, index) => (
        <Button
          key={index}
          testID={`answer-${index}`}
          variant="secondary"
          label={option}
          onPress={() => dispatch({ type: 'AnswerQuestion', answerIndex: index })}
        />
      ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center' },
  prompt: {
    fontSize: 22,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
});
