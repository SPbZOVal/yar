import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { colors } from '../theme';

const CHAR_MS = 26;

/**
 * Visual-novel dialogue box: a bottom panel with an optional speaker nameplate and the line typed
 * out character by character. Tapping the box reveals the rest of the line; once it's fully shown,
 * a tap calls `onAdvance`, or — when `choices` are provided (the question screen) — those render in
 * place of the advance caret. Shared by the cutscene and question screens.
 */
export function DialogueBox({
  speaker,
  text,
  onAdvance,
  choices,
  testID = 'vn-box',
}: {
  speaker?: string;
  text: string;
  onAdvance?: () => void;
  choices?: ReactNode;
  testID?: string;
}) {
  const [shown, setShown] = useState(0);
  const done = shown >= text.length;

  // Type the line out, restarting whenever it changes (cutscene paging). The interval clears
  // itself at the end and on unmount, so it never outlives the line or the screen.
  useEffect(() => {
    setShown(0);
    if (text.length === 0) return;
    const id = setInterval(() => {
      setShown((n) => {
        if (n + 1 >= text.length) {
          clearInterval(id);
          return text.length;
        }
        return n + 1;
      });
    }, CHAR_MS);
    return () => clearInterval(id);
  }, [text]);

  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 260 });
  }, [opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const onPress = (): void => {
    if (!done) setShown(text.length);
    else onAdvance?.();
  };

  return (
    <Animated.View style={[styles.wrap, fade]}>
      <Pressable testID={testID} style={styles.box} onPress={onPress}>
        {speaker ? <Text style={styles.name}>{speaker}</Text> : null}
        <Text style={styles.text}>
          {text.slice(0, shown)}
          {!done && <Text style={styles.caret}>▌</Text>}
        </Text>
        {done &&
          (choices ?? (onAdvance !== undefined && <Text style={styles.cont}>▼ дальше</Text>))}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 16 },
  box: {
    backgroundColor: 'rgba(17,19,26,0.92)',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 132,
  },
  name: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  text: { color: colors.text, fontSize: 18, lineHeight: 26 },
  caret: { color: colors.primary },
  cont: { color: colors.textDim, fontSize: 13, marginTop: 10, alignSelf: 'flex-end' },
});
