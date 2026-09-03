import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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

// Height of one row in the custom iOS wheels, and how many rows are visible.
const ITEM_HEIGHT = s(44);
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
// Padding above/below the list so the first and last items can settle in the
// centre selection band.
const WHEEL_PAD = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const PERIODS = ['AM', 'PM'];

// Replaces the old free-type "HH:MM 24h" box: staff kept fat-fingering the
// colon/format. On Android it opens the platform clock dial. On iOS it opens a
// custom hour / minute / AM-PM wheel built from plain ScrollViews instead of
// the native spinner picker — the native iOS spinner crashes on open under the
// New Architecture, and being native it can't be trusted in Expo Go either.
// The form value stays 24h "HH:MM" so validation and the combineDateAndTime
// helpers are untouched; only the on-screen label is the friendlier 12-hour
// "9:00 AM" form.
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
  const insets = useSafeAreaInsets();
  const showError = !!error;

  const minutes = useMemo(() => buildMinutes(minuteInterval), [minuteInterval]);

  const initial = parseHhMm(value) ?? defaultTime();

  // Live wheel selection, kept in a ref so scrolling never re-renders the
  // sheet (and so the wheels never get reset out from under the user). Read
  // on "Done".
  const selectionRef = useRef({ hourIdx: 0, minuteIdx: 0, periodIdx: 0 });
  // Where each wheel should sit when the sheet opens.
  const [startIdx, setStartIdx] = useState({ hourIdx: 0, minuteIdx: 0, periodIdx: 0 });

  const openPicker = () => {
    const start = toIndices(initial, minutes);
    selectionRef.current = start;
    setStartIdx(start);
    setOpen(true);
  };

  const commitFromWheels = () => {
    const { hourIdx, minuteIdx, periodIdx } = selectionRef.current;
    const hour12 = Number(HOURS[hourIdx] ?? '12');
    const minute = Number(minutes[minuteIdx] ?? '0');
    const isPM = periodIdx === 1;
    let hour24 = hour12 % 12; // 12 -> 0
    if (isPM) hour24 += 12; // AM 12 stays 0 (midnight); PM 12 -> 12
    onChange(`${pad(hour24)}:${pad(minute)}`);
    setOpen(false);
  };

  const onChangeAndroid = (event: DateTimePickerEvent, selected?: Date) => {
    setOpen(false);
    if (event.type === 'set' && selected) {
      onChange(formatHhMm24(selected));
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
          onChange={onChangeAndroid}
        />
      ) : null}

      {/* iOS gets a custom wheel sheet with a Done button. */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={open}
          transparent
          animationType="slide"
          onRequestClose={() => setOpen(false)}
          statusBarTranslucent
          presentationStyle="overFullScreen">
          <View style={styles.iosBackdrop}>
            {/* Backdrop tap-to-dismiss sits BEHIND the sheet as a sibling, so
                nothing wraps the wheels — wrapping a ScrollView in a Touchable
                swallows its pan gesture and the wheels won't scroll. */}
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
            <View style={[styles.iosSheet, { paddingBottom: spacing.xl + insets.bottom }]}>
              <View style={styles.iosHeader}>
                <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                  <Text style={styles.iosCancel}>Cancel</Text>
                </Pressable>
                <Text style={styles.iosTitle}>{label || 'Select time'}</Text>
                <Pressable onPress={commitFromWheels} hitSlop={10}>
                  <Text style={styles.iosDone}>Done</Text>
                </Pressable>
              </View>

              <View style={styles.wheelRow}>
                {/* Centre selection band behind the wheels. */}
                <View pointerEvents="none" style={styles.centerBand} />

                <WheelColumn
                  items={HOURS}
                  initialIndex={startIdx.hourIdx}
                  onSelect={(i) => {
                    selectionRef.current.hourIdx = i;
                  }}
                />
                <Text style={styles.wheelSeparator}>:</Text>
                <WheelColumn
                  items={minutes}
                  initialIndex={startIdx.minuteIdx}
                  onSelect={(i) => {
                    selectionRef.current.minuteIdx = i;
                  }}
                />
                <WheelColumn
                  items={PERIODS}
                  initialIndex={startIdx.periodIdx}
                  onSelect={(i) => {
                    selectionRef.current.periodIdx = i;
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

// A single vertical wheel. Snapping is done natively by snapToInterval; the
// nearest row is tracked continuously into the parent via onSelect (a ref
// write, so no re-render churn while scrolling).
function WheelColumn({
  items,
  initialIndex,
  onSelect,
}: {
  items: string[];
  initialIndex: number;
  onSelect: (index: number) => void;
}) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    // Jump to the starting row once laid out.
    const id = setTimeout(() => {
      ref.current?.scrollTo({ y: initialIndex * ITEM_HEIGHT, animated: false });
    }, 0);
    return () => clearTimeout(id);
  }, [initialIndex]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = clamp(Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT), 0, items.length - 1);
    onSelect(idx);
  };

  return (
    <View style={styles.wheelCol}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={{ paddingVertical: WHEEL_PAD }}>
        {items.map((it) => (
          <View key={it} style={styles.wheelItem}>
            <Text style={styles.wheelItemText}>{it}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function buildMinutes(interval: number): string[] {
  const step = interval && interval > 0 ? interval : 1;
  const out: string[] = [];
  for (let m = 0; m < 60; m += step) out.push(pad(m));
  return out;
}

// Map a Date to the {hour, minute, period} wheel indices.
function toIndices(d: Date, minutes: string[]) {
  const h24 = d.getHours();
  const m = d.getMinutes();
  const periodIdx = h24 >= 12 ? 1 : 0;
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const hourIdx = hour12 - 1;
  // Nearest available minute row for the configured interval.
  let minuteIdx = 0;
  let best = Infinity;
  minutes.forEach((mm, i) => {
    const diff = Math.abs(Number(mm) - m);
    if (diff < best) {
      best = diff;
      minuteIdx = i;
    }
  });
  return { hourIdx, minuteIdx, periodIdx };
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
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  wheelRow: {
    flexDirection: 'row',
    height: WHEEL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  centerBand: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    top: WHEEL_PAD,
    height: ITEM_HEIGHT,
    borderRadius: radius.md,
    backgroundColor: colors.background.surface,
  },
  wheelCol: {
    flex: 1,
    height: WHEEL_HEIGHT,
  },
  wheelSeparator: {
    ...typography.title.large,
    fontFamily: 'Inter_700Bold',
    color: colors.text.primary,
    paddingBottom: 2,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelItemText: {
    ...typography.title.medium,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text.primary,
    fontSize: ms(20),
  },
});
