import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

type Variant = 'primary' | 'secondary' | 'danger';

/** Themed pressable button used across the RN screens. */
export function Button({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.base, styles[variant], disabled && styles.disabled]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 6,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surfaceAlt },
  danger: { backgroundColor: colors.danger },
  disabled: { opacity: 0.4 },
  text: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
