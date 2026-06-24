import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { deriveStatus, formatEventTime } from '@/lib/appointments';
import { ms, s } from '@/lib/responsive';
import { colors, radius, spacing, typography } from '@/theme';
import type { BackendEvent } from '@/types/appointments';

// Continuous-timeline Day view with drag-and-drop rescheduling.
//
// The previous Day view bucketed events into discrete hour rows, which made
// drag-and-drop impossible (no continuous y-axis to translate against).
// Here each hour occupies a fixed pixel height; events are absolute-
// positioned by their start time, sized by duration. A long-press on an
// event card promotes it to drag mode — pan tracks the finger, on release
// the y-position snaps to the nearest 15-minute slot and onReschedule is
// called with the proposed new start.

const HOUR_HEIGHT = s(72);
const SNAP_MINUTES = 15;
const TIME_LABEL_WIDTH = s(56);
const LONG_PRESS_MS = 300;

type Props = {
  events: BackendEvent[];
  selectedDate: Date;
  dayStartHour: number;
  dayEndHour: number;
  onSelectEvent: (event: BackendEvent) => void;
  onSelectEmpty: (hour: number) => void;
  onReschedule: (event: BackendEvent, newStart: Date) => void;
};

type Geometry = {
  event: BackendEvent;
  top: number;
  height: number;
};

export function DraggableDayTimeline({
  events,
  selectedDate,
  dayStartHour,
  dayEndHour,
  onSelectEvent,
  onSelectEmpty,
  onReschedule,
}: Props) {
  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = dayStartHour; h <= dayEndHour; h++) arr.push(h);
    return arr;
  }, [dayStartHour, dayEndHour]);

  const totalHours = dayEndHour - dayStartHour + 1;
  const timelineHeight = totalHours * HOUR_HEIGHT;

  const geometries = useMemo<Geometry[]>(() => {
    return events
      .map((event) => {
        const start = new Date(event.start);
        const end = new Date(event.end);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
        const startMin = start.getHours() * 60 + start.getMinutes();
        const endMin = end.getHours() * 60 + end.getMinutes();
        const top = ((startMin - dayStartHour * 60) / 60) * HOUR_HEIGHT;
        const duration = Math.max(15, endMin - startMin);
        const height = Math.max(s(32), (duration / 60) * HOUR_HEIGHT - 2);
        return { event, top, height };
      })
      .filter((g): g is Geometry => g !== null);
  }, [events, dayStartHour]);

  return (
    <View style={[styles.container, { height: timelineHeight }]}>
      {hours.map((h, i) => (
        <View key={h} style={[styles.hourRow, { top: i * HOUR_HEIGHT }]}>
          <Text style={styles.hourLabel}>{formatHour(h)}</Text>
          <View style={styles.hourLine} />
        </View>
      ))}

      <View style={[styles.tapLayer, { left: TIME_LABEL_WIDTH + s(8) }]}>
        {hours.slice(0, -1).map((h, i) => (
          <Pressable
            key={`tap-${h}`}
            accessibilityRole="button"
            accessibilityLabel={`Book appointment at ${formatHour(h)}`}
            onPress={() => onSelectEmpty(h)}
            style={[
              styles.tapZone,
              { top: i * HOUR_HEIGHT, height: HOUR_HEIGHT },
            ]}>
            <View style={styles.tapHint}>
              <Ionicons name="add-outline" size={ms(14)} color={colors.text.secondary} />
              <Text style={styles.tapHintText}>Tap to book</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={[styles.eventsLayer, { left: TIME_LABEL_WIDTH + s(8) }]}>
        {geometries.map((g) => (
          <DraggableEventCard
            key={String(g.event.extendedProps?.mainId ?? g.event.id)}
            geometry={g}
            maxBottom={timelineHeight}
            selectedDate={selectedDate}
            dayStartHour={dayStartHour}
            onTap={() => onSelectEvent(g.event)}
            onReschedule={onReschedule}
          />
        ))}
      </View>
    </View>
  );
}

function DraggableEventCard({
  geometry,
  maxBottom,
  selectedDate,
  dayStartHour,
  onTap,
  onReschedule,
}: {
  geometry: Geometry;
  maxBottom: number;
  selectedDate: Date;
  dayStartHour: number;
  onTap: () => void;
  onReschedule: (event: BackendEvent, newStart: Date) => void;
}) {
  const { event, top, height } = geometry;
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(0);

  // Worklet-safe: compute new start from finger offset, snap to SNAP_MINUTES,
  // clamp so the event can't end past the day window, and bail if the user
  // dropped it back where it started.
  const finishDrag = (finalDy: number) => {
    const rawTop = top + finalDy;
    const clampedTop = Math.max(0, Math.min(rawTop, maxBottom - height));
    const minutesFromDayStart = (clampedTop / HOUR_HEIGHT) * 60;
    const snapped =
      Math.round(minutesFromDayStart / SNAP_MINUTES) * SNAP_MINUTES;
    const snappedTop = (snapped / 60) * HOUR_HEIGHT;
    if (Math.abs(snappedTop - top) < 1) return;

    const totalMins = dayStartHour * 60 + snapped;
    const newStart = new Date(selectedDate);
    newStart.setHours(Math.floor(totalMins / 60), totalMins % 60, 0, 0);
    onReschedule(event, newStart);
  };

  const palette = paletteForEvent(event);
  const fullName = `${(event.name ?? '').trim()} ${(event.family ?? '').trim()}`.trim();
  const timeRange = `${formatEventTime(event.start)} - ${formatEventTime(event.end)}`;
  const treatment = event.extendedProps?.procedure ?? '';
  const doctor = event.doctor ? `Dr. ${event.doctor}` : '';

  // Card heights are duration-driven, so a 30-min appointment is only ~34dp
  // tall — not enough vertical space for 4 lines of text. Without these
  // thresholds the bottom lines used to overflow past the card's painted
  // background and visually collide with the next hour's "Tap to book"
  // hint. Show progressively more detail as the card grows.
  const showTime = height >= s(34);
  const showTreatment = height >= s(54) && !!treatment;
  const showDoctor = height >= s(70) && !!doctor;

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart(() => {
      isDragging.value = 1;
    })
    .onUpdate((e) => {
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(finishDrag)(e.translationY);
      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      isDragging.value = 0;
    })
    .onFinalize(() => {
      // Defensive: in case onEnd didn't fire (cancellation), reset state.
      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      isDragging.value = 0;
    });

  const tapGesture = Gesture.Tap()
    .maxDuration(LONG_PRESS_MS - 20)
    .onEnd(() => {
      runOnJS(onTap)();
    });

  const composed = Gesture.Exclusive(panGesture, tapGesture);

  const animStyle = useAnimatedStyle(() => {
    const dragging = isDragging.value === 1;
    return {
      transform: [
        { translateY: translateY.value },
        { scale: withSpring(dragging ? 1.03 : 1, { damping: 18, stiffness: 240 }) },
      ],
      shadowOpacity: withSpring(dragging ? 0.25 : 0.08, { damping: 18 }),
      elevation: dragging ? 12 : 2,
      zIndex: dragging ? 100 : 1,
    };
  });

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          styles.eventCard,
          {
            top,
            height,
            backgroundColor: palette.bg,
            borderLeftColor: palette.border,
          },
          animStyle,
        ]}>
        <View style={[styles.statusDot, { backgroundColor: palette.dot }]} />
        <Text style={styles.eventName} numberOfLines={1}>
          {fullName || 'Unknown'}
        </Text>
        {showTime ? (
          <Text style={styles.eventTime} numberOfLines={1}>
            {timeRange}
          </Text>
        ) : null}
        {showTreatment ? (
          <Text style={styles.eventTreatment} numberOfLines={1}>
            {treatment}
          </Text>
        ) : null}
        {showDoctor ? (
          <Text style={styles.eventDoctor} numberOfLines={1}>
            {doctor}
          </Text>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

function paletteForEvent(event: BackendEvent): { border: string; bg: string; dot: string } {
  const status = deriveStatus(event);
  if (status === 'confirmed') {
    return { border: colors.success[500], bg: colors.success[0], dot: colors.success[500] };
  }
  if (status === 'cancelled') {
    return { border: colors.danger[500], bg: colors.danger[10], dot: colors.danger[500] };
  }
  // Per-doctor palette — keep in sync with the calendar's existing
  // doctorPalette, but redefine here so this component is self-contained.
  // Cycling four hues by first-letter index gives stable colors per doctor
  // without needing an external store.
  const hue = (event.doctor || '').trim().toLowerCase().charCodeAt(0) % 4;
  const palettes = [
    { border: '#3B82F6', bg: '#EFF6FF', dot: '#3B82F6' },
    { border: '#8B5CF6', bg: '#F5F3FF', dot: '#8B5CF6' },
    { border: '#F59E0B', bg: '#FFFBEB', dot: '#F59E0B' },
    { border: '#10B981', bg: '#ECFDF5', dot: '#10B981' },
  ];
  return palettes[hue] || palettes[0];
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12} ${period}`;
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: HOUR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hourLabel: {
    width: TIME_LABEL_WIDTH,
    paddingTop: spacing.xs,
    paddingRight: spacing.xs,
    textAlign: 'right',
    ...typography.body.small,
    color: colors.text.secondary,
  },
  hourLine: {
    flex: 1,
    marginLeft: s(8),
    marginTop: spacing.xs + 2,
    height: 1,
    backgroundColor: colors.border.subtle,
  },
  tapLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
  },
  tapZone: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    opacity: 0.5,
  },
  tapHintText: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  eventsLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
  },
  eventCard: {
    position: 'absolute',
    left: 0,
    right: spacing.sm,
    borderLeftWidth: 4,
    borderRadius: radius.lg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingRight: spacing.lg,
    gap: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  statusDot: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: s(8),
    height: s(8),
    borderRadius: radius.pill,
  },
  eventName: {
    ...typography.body.medium,
    fontFamily: 'Inter_600SemiBold',
    color: colors.neutral[500],
  },
  eventTime: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  eventTreatment: {
    ...typography.body.small,
    fontFamily: 'Inter_600SemiBold',
    color: colors.neutral[500],
  },
  eventDoctor: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
});
