import { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  type StyleProp,
  type TextInputProps as RNTextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/theme';

export type TextInputProps = Omit<RNTextInputProps, 'style'> & {
  label?: string;
  error?: string | null;
  helperText?: string;
  secure?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(
  { label, error, helperText, secure = false, containerStyle, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);
  const showError = !!error;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrap,
          focused && !showError && styles.inputFocused,
          showError && styles.inputError,
        ]}
      >
        <RNTextInput
          ref={ref}
          style={styles.input}
          placeholderTextColor={colors.text.secondary}
          secureTextEntry={secure && !reveal}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={reveal ? 'Hide password' : 'Show password'}
            hitSlop={8}
            onPress={() => setReveal((r) => !r)}
            style={styles.adornment}
          >
            <Ionicons
              name={reveal ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.text.secondary}
            />
          </Pressable>
        ) : null}
      </View>
      {showError ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.label.large,
    color: colors.text.primary,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 20,
    backgroundColor: colors.background.base,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.pill,
  },
  inputFocused: {
    borderColor: colors.primary[500],
  },
  inputError: {
    borderColor: colors.danger[500],
  },
  input: {
    flex: 1,
    ...typography.body.medium,
    color: colors.text.primary,
    paddingVertical: spacing.md,
  },
  adornment: {
    paddingLeft: spacing.sm,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    ...typography.body.small,
    color: colors.text.secondary,
    marginLeft: spacing.lg,
  },
  errorText: {
    ...typography.body.small,
    color: colors.danger[500],
    marginLeft: spacing.lg,
  },
});
