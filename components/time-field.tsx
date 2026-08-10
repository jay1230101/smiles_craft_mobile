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
  // 24-hour "HH:MM" string (what the form + backend use). Empty means unset.
  value: string;
  onChange: (formatted: string) => void;
  placeholder?: string;
  error?: string | null;
  minuteInterval?: 1 | 5 | 10 | 15 | 30;
  containerStyle?: StyleProp<ViewStyle>;
};

const HHMM_REGEX = /^(\d{1,2}):(\d{2})$/;

// Replaces the old free-type "HH:MM 24h" box: staff kept fat-fingering the
// colon/format. This opens the platform's native time picker instead — the
// Android clock dial and the iOS wheel, the same interaction Google/Apple
// Calendar use. The form value stays 24h "HH:MM" so validation and the
// combineDateAndTime helpers are untouched; only the on-screen label is the
// friendlier 12-hour "9:00 AM" form.
export function TimeField({
  label,
  value,
  onChange,
  placeholder = 'Select time',
  error,
  minuteInterval = 5,
  containerStyle,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date | null>(null);
  const insets = useSafeAreaInsets();
  const showError = !!error;

  const initial = parseHhMm(value) ?? defaultTime();

  const openPicker = () => {
    setDraft(initial);
    setOpen(true);
  };

  const commit = (d: Date) => {
    onChange(formatHhMm24(d));
  };

  const onChangeNative = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setOpen(false);
      if (event.type === 'set' && selected) {
        commit(selected);
      }
    } else if (selected) {
      setDraft(selected);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ? `${label} picker` : 'Time picker'}
        onPress={openPicker}
        style={({ pressed }) => [
          styles.field,
          showError && styles.fieldError,
          pressed && styles.fieldPressed,
        ]}>
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
          {value ? formatHhMm12(value) : placeholder}
        </Text>
        <Ionicons name="time-outline" size={ms(18)} color={colors.text.secondary} />
      </Pressable>

      {showError ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Android renders its own clock dialog imperatively. */}
      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          mode="time"
          display="default"
          is24Hour={false}
          minuteInterval={minuteInterval}
          value={initial}
          onChange={onChangeNative}
        />
      ) : null}

      {/* iOS gets a bottom-sheet wheel with a Done button. */}
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
                    <Text style={styles.iosTitle}>{label || 'Select time'}</Text>
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
                    mode="time"
                    display="spinner"
                    is24Hour={false}
                    minuteInterval={minuteInterval}
                    value={draft ?? initial}
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

function parseHhMm(input: string): Date | null {
  const m = input.match(HHMM_REGEX);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d;
}

function defaultTime(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return d;
}

function formatHhMm24(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 24h "14:30" -> "2:30 PM" for display only.
function formatHhMm12(hhmm: string): string {
  const m = hhmm.match(HHMM_REGEX);
  if (!m) return hhmm;
  let h = Number(m[1]);
  const min = m[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h %= 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${ampm}`;
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    flex: 1,
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
    height: s(216),
    backgroundColor: colors.background.base,
  },
});
