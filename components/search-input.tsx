import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput as RNTextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type Props = TextInputProps & {
  placeholder?: string;
};

export function SearchInput({ placeholder = 'Search…', style, ...rest }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <Ionicons name="search" size={18} color={colors.text.secondary} style={styles.icon} />
      <RNTextInput
        placeholder={placeholder}
        placeholderTextColor={colors.text.secondary}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    backgroundColor: colors.background.base,
    gap: spacing.sm,
  },
  icon: {
    opacity: 0.7,
  },
  input: {
    flex: 1,
    ...typography.body.large,
    color: colors.text.primary,
    paddingVertical: 0,
  },
});
