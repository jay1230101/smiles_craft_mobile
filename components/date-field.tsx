import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ms, s } from '@/lib/responsive';
import { colors, radius, spacing, typography } from '@/theme';

type Props = {
  label?: string;
  // ISO-ish DD-MM-YYYY string. Empty string means "no date selected yet".
  value: string;
  onChange: (formatted: string) => void;
  placeholder?: string;
  helperText?: string;
  error?: string | null;
  // Latest selectable date; defaults to today (we use the field for DOB).
  maximumDate?: Date;
  // Earliest selectable date; defaults to ~120 years ago.
  minimumDate?: Date;
  containerStyle?: StyleProp<ViewStyle>;
};

const DOB_REGEX = /^(\d{2})-(\d{2})-(\d{4})$/;

export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  helperText,
  error,
  maximumDate,
  minimumDate,
  containerStyle,
}: Props) {
  const [open, setOpen] = useState(false);
  // Track an in-flight selection separately on iOS so the "Done" button
  // commits the choice. On Android the native dialog already has its own
  // OK/Cancel, so we just react to the event directly.
  const [draft, setDraft] = useState<Date | null>(null);
  const insets = useSafeAreaInsets();
  const showError = !!error;

  const initial = parseDdMmYyyy(value) ?? new Date(1995, 0, 1);
  const max = maximumDate ?? new Date();
  const min = minimumDate ?? new Date(new Date().getFullYear() - 120, 0, 1);

  const openPicker = () => {
    setDraft(initial);
    setOpen(true);
  };

  const commit = (d: Date) => {
    onChange(formatDdMmYyyy(d));
  };

  const onChangeNative = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      // Android fires once with type === 'set' on confirm, or 'dismissed' on
      // cancel. Either way the dialog closes itself.
      setOpen(false);
      if (event.type === 'set' && selected) {
        commit(selected);
      }
    } else if (selected) {
      // iOS spinner / inline updates the draft as the user scrolls; we
      // commit on the Done button.
      setDraft(selected);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ? `${label} picker` : 'Date picker'}
        onPress={openPicker}
        style={({ pressed }) => [
          styles.field,
          showError && styles.fieldError,
          pressed && styles.fieldPressed,
        ]}>
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={ms(18)} color={colors.text.secondary} />
      </Pressable>

      {showError ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}

      {/* Android renders its own dialog imperatively; mounting + onChange does the work. */}
      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          mode="date"
          display="calendar"
          value={initial}
          maximumDate={max}
          minimumDate={min}
          onChange={onChangeNative}
        />
      ) : null}

      {/* iOS gets a bottom-sheet modal with a Done button. */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={open}
          transparent
          animationType="slide"
          onRequestClose={() => setOpen(false)}
          statusBarTranslucent
          presentationStyle="overFullScreen">
          <TouchableWithoutFeedback onPress={() => setOpen(false)}>
            <View style={styles.iosBackdrop}>
              <TouchableWithoutFeedback>
                <View style={[styles.iosSheet, { paddingBottom: spacing.xl + insets.bottom }]}>
                  <View style={styles.iosHeader}>
                    <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                      <Text style={styles.iosCancel}>Cancel</Text>
                    </Pressable>
                    <Text style={styles.iosTitle}>{label || 'Select date'}</Text>
                    <Pressable
                      onPress={() => {
                        if (draft) commit(draft);
                        setOpen(false);
                      }}
                      hitSlop={10}>
                      <Text style={styles.iosDone}>Done</Text>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    mode="date"
                    // "inline" is the iOS 14+ calendar-grid picker. The
                    // older "spinner" / wheels mode kept rendering empty
                    // inside this Modal even with an explicit height.
                    // Inline renders reliably and matches modern iOS UX.
                    display="inline"
                    value={draft ?? initial}
                    maximumDate={max}
                    minimumDate={min}
                    onChange={onChangeNative}
                    themeVariant="light"
                    style={styles.iosPicker}
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      ) : null}
    </View>
  );
}

function parseDdMmYyyy(input: string): Date | null {
  const m = input.match(DOB_REGEX);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return isNaN(d.getTime()) ? null : d;
}

function formatDdMmYyyy(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear()).padStart(4, '0');
  return `${dd}-${mm}-${yyyy}`;
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.label.large,
    color: colors.text.primary,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: s(48),
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.base,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
  },
  fieldPressed: {
    opacity: 0.7,
  },
  fieldError: {
    borderColor: colors.danger[500],
  },
  value: {
    flex: 1,
    ...typography.body.medium,
    color: colors.text.primary,
  },
  placeholder: {
    color: colors.text.secondary,
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
  iosBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  iosSheet: {
    backgroundColor: colors.background.base,
    borderTopLeftRadius: s(20),
    borderTopRightRadius: s(20),
  },
  iosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  iosCancel: {
    ...typography.label.large,
    color: colors.text.secondary,
    fontSize: ms(15),
  },
  iosDone: {
    ...typography.label.large,
    color: colors.primary[500],
    fontFamily: 'Inter_600SemiBold',
    fontSize: ms(15),
  },
  iosTitle: {
    ...typography.label.large,
    color: colors.text.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: ms(15),
  },
  iosPicker: {
    // The inline calendar-grid picker needs a generous height — it draws
    // a month grid plus a header row. Without an explicit height the
    // native control collapses to a thin grey placeholder.
    height: s(360),
    backgroundColor: colors.background.base,
  },
});
