import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/theme';

type CheckboxProps = {
  value: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
};

export function Checkbox({ value, onChange, label, disabled = false }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      hitSlop={8}
      style={styles.row}
    >
      <View
        style={[
          styles.box,
          value && styles.boxChecked,
          disabled && styles.boxDisabled,
        ]}
      >
        {value ? <Ionicons name="checkmark" size={14} color={colors.text.inverse} /> : null}
      </View>
      {label ? <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  boxDisabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.title.medium,
    color: colors.text.primary,
  },
  labelDisabled: {
    color: colors.text.disabled,
  },
});
