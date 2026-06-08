import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ms, s } from '@/lib/responsive';
import { colors, radius, spacing, typography } from '@/theme';

export type SelectOption<T extends string | number> = {
  value: T;
  label: string;
};

type Props<T extends string | number> = {
  label?: string;
  placeholder?: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  error?: string | null;
  helperText?: string;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export function Select<T extends string | number>({
  label,
  placeholder = 'Select…',
  value,
  options,
  onChange,
  error,
  helperText,
  disabled,
  containerStyle,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const showError = !!error;
  const selected = options.find((o) => o.value === value);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          showError && styles.fieldError,
          disabled && styles.fieldDisabled,
          pressed && !disabled && styles.fieldPressed,
        ]}>
        <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={s(18)} color={colors.text.secondary} />
      </Pressable>
      {showError ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}

      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {label ? <Text style={styles.sheetTitle}>{label}</Text> : null}
            <ScrollView
              style={styles.sheetList}
              contentContainerStyle={styles.sheetListContent}
              showsVerticalScrollIndicator={false}>
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <Pressable
                    key={String(opt.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      isSelected && styles.optionSelected,
                      pressed && styles.optionPressed,
                    ]}>
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && styles.optionLabelSelected,
                      ]}
                      numberOfLines={1}>
                      {opt.label}
                    </Text>
                    {isSelected ? (
                      <Ionicons name="checkmark" size={s(20)} color={colors.primary[500]} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.body.medium,
    fontFamily: 'Inter_500Medium',
    color: colors.neutral[500],
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: s(14),
    backgroundColor: colors.background.base,
    gap: spacing.sm,
  },
  fieldPressed: {
    opacity: 0.7,
  },
  fieldError: {
    borderColor: colors.danger[500],
  },
  fieldDisabled: {
    backgroundColor: colors.background.surface,
    opacity: 0.6,
  },
  value: {
    ...typography.body.large,
    color: colors.neutral[500],
    flex: 1,
  },
  placeholder: {
    color: colors.text.secondary,
  },
  errorText: {
    ...typography.body.small,
    color: colors.danger[500],
  },
  helperText: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background.base,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    maxHeight: '70%',
  },
  sheetTitle: {
    ...typography.title.medium,
    fontFamily: 'Inter_600SemiBold',
    color: colors.neutral[500],
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
  },
  sheetList: {
    flexGrow: 0,
  },
  sheetListContent: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: s(14),
    borderRadius: radius.md,
    backgroundColor: colors.background.base,
  },
  optionSelected: {
    backgroundColor: colors.primary[0],
  },
  optionPressed: {
    opacity: 0.7,
  },
  optionLabel: {
    ...typography.body.large,
    color: colors.neutral[500],
    fontSize: ms(15),
    flex: 1,
  },
  optionLabelSelected: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary[500],
  },
});
