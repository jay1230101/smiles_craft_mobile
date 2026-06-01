import { Pressable, StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { colors, typography } from '@/theme';

type LinkTextProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'inline' | 'standalone';
  style?: StyleProp<TextStyle>;
};

export function LinkText({ label, onPress, disabled = false, variant = 'inline', style }: LinkTextProps) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Text
        style={[
          variant === 'standalone' ? styles.standalone : styles.inline,
          disabled && styles.disabled,
          style,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inline: {
    ...typography.label.medium,
    color: colors.primary[500],
  },
  standalone: {
    ...typography.label.large,
    color: colors.primary[500],
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    color: colors.text.disabled,
  },
});
