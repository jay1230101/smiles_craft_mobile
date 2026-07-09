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

import { deriveStatus, formatDoctorName, formatEventTime } from '@/lib/appointments';
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
const TIME_LABEL_WIDTH = s(60);
const LONG_PRESS_MS = 300;
// Minimum row height — keeps half-hour slots tappable (above the iOS 44dp
// minimum) without compressing labels onto two lines.
const MIN_SLOT_HEIGHT = s(44);

type Props = {
  events: BackendEvent[];
  selectedDate: Date;
  dayStartHour: number;
  dayEndHour: number;
  // Clinic-configured slot duration in minutes (30, 60, etc.) so the grid
  // subdivisions, snap granularity, and tap-to-book default duration all
  // match the web app's behavior for the same clinic.
  slotMinutes: number;
  // True when the "All Doctors" filter is active in a multi-doctor clinic.
  // In that mode each card swaps its start/end time line for the doctor's
  // name, since knowing *who* the appointment is with matters more than the
  // exact time when several doctors' schedules share one column.
  allDoctorsView?: boolean;
  onSelectEvent: (event: BackendEvent) => void;
  // hourFloat is the slot start expressed as hours-since-midnight (8.0, 8.5...).
  onSelectEmpty: (hourFloat: number) => void;
  onReschedule: (event: BackendEvent, newStart: Date) => void;
};

type Geometry = {
  event: BackendEvent;
  top: number;
  height: number;
  // Side-by-side column layout for overlapping events. column = index in
  // the parallel set (0..columns-1), columns = total parallel cards at this
  // moment. Single-event slots have column=0, columns=1.
  column: number;
  columns: number;
};

export function DraggableDayTimeline({
  events,
  selectedDate,
  dayStartHour,
  dayEndHour,
  slotMinutes,
  allDoctorsView = false,
  onSelectEvent,
  onSelectEmpty,
  onReschedule,
}: Props) {
  const safeSlotMinutes = slotMinutes > 0 ? slotMinutes : 60;
  const slotPx = Math.max(MIN_SLOT_HEIGHT, (HOUR_HEIGHT * safeSlotMinutes) / 60);

  const slots = useMemo(() => {
    // Slot start times in minutes-since-midnight, from dayStart up to (but not
    // including) dayEnd. Each entry becomes a labelled tap-to-book row.
    const start = dayStartHour * 60;
    const end = dayEndHour * 60;
    const arr: number[] = [];
    for (let m = start; m < end; m += safeSlotMinutes) arr.push(m);
    return arr;
  }, [dayStartHour, dayEndHour, safeSlotMinutes]);

  const timelineHeight = slots.length * slotPx;

  const geometries = useMemo<Geometry[]>(() => {
    type Base = {
      event: BackendEvent;
      top: number;
      height: number;
      startMin: number;
      endMin: number;
    };

    const bases: Base[] = [];
    const pxPerMinute = slotPx / safeSlotMinutes;
    for (const event of events) {
      const start = new Date(event.start);
      const end = new Date(event.end);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;
      const startMin = start.getHours() * 60 + start.getMinutes();
      const endMin = end.getHours() * 60 + end.getMinutes();
      const top = (startMin - dayStartHour * 60) * pxPerMinute;
      const duration = Math.max(safeSlotMinutes, endMin - startMin);
      const height = Math.max(s(32), duration * pxPerMinute - 2);
      bases.push({ event, top, height, startMin, endMin });
    }

    // Greedy column assignment over time-overlapping clusters so events that
    // share a moment render side-by-side instead of stacking on top of one
    // another. Previously two concurrent appointments (e.g. Dr A and Dr B
    // both at 10 AM under "All Doctors") collapsed to a single visible card.
    bases.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

    const out: Geometry[] = [];
    let cluster: Base[] = [];
    let clusterEnd = -1;

    const flush = () => {
      if (!cluster.length) return;
      const lanes: number[] = [];
      const cols = new Map<Base, number>();
      for (const b of cluster) {
        let placed = -1;
        for (let i = 0; i < lanes.length; i++) {
          if (lanes[i] <= b.startMin) {
            lanes[i] = b.endMin;
            placed = i;
            break;
          }
        }
        if (placed === -1) {
          lanes.push(b.endMin);
          placed = lanes.length - 1;
        }
        cols.set(b, placed);
      }
      const columns = lanes.length;
      for (const b of cluster) {
        out.push({
          event: b.event,
          top: b.top,
          height: b.height,
          column: cols.get(b) ?? 0,
          columns,
        });
      }
      cluster = [];
      clusterEnd = -1;
    };

    for (const b of bases) {
      if (cluster.length === 0 || b.startMin < clusterEnd) {
        cluster.push(b);
        clusterEnd = Math.max(clusterEnd, b.endMin);
      } else {
        flush();
        cluster.push(b);
        clusterEnd = b.endMin;
      }
    }
    flush();

    return out;
  }, [events, dayStartHour, slotPx, safeSlotMinutes]);

  return (
    <View style={[styles.container, { height: timelineHeight }]}>
      {slots.map((m, i) => {
        const isHour = m % 60 === 0;
        return (
          <View key={m} style={[styles.hourRow, { top: i * slotPx }]}>
            <Text style={[styles.hourLabel, !isHour && styles.minorLabel]}>
              {formatMinutes(m)}
            </Text>
            <View style={[styles.hourLine, !isHour && styles.minorLine]} />
          </View>
        );
      })}

      <View style={[styles.tapLayer, { left: TIME_LABEL_WIDTH + s(8) }]}>
        {slots.map((m, i) => (
          <Pressable
            key={`tap-${m}`}
            accessibilityRole="button"
            accessibilityLabel={`Book appointment at ${formatMinutes(m)}`}
            onPress={() => onSelectEmpty(m / 60)}
            style={[
              styles.tapZone,
              { top: i * slotPx, height: slotPx },
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
            slotPx={slotPx}
            slotMinutes={safeSlotMinutes}
            allDoctorsView={allDoctorsView}
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
  slotPx,
  slotMinutes,
  allDoctorsView,
  onTap,
  onReschedule,
}: {
  geometry: Geometry;
  maxBottom: number;
  selectedDate: Date;
  dayStartHour: number;
  slotPx: number;
  slotMinutes: number;
  allDoctorsView: boolean;
  onTap: () => void;
  onReschedule: (event: BackendEvent, newStart: Date) => void;
}) {
  const { event, top, height, column, columns } = geometry;
  const colSlot = 100 / columns;
  // Leave a 1% gap between adjacent columns so overlapping cards don't visually
  // merge into a single block.
  const widthPct = colSlot - 1;
  const leftPct = column * colSlot;
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(0);
  const pxPerMinute = slotPx / slotMinutes;

  // Worklet-safe: compute new start from finger offset, snap to slotMinutes,
  // clamp so the event can't end past the day window, and bail if the user
  // dropped it back where it started.
  const finishDrag = (finalDy: number) => {
    const rawTop = top + finalDy;
    const clampedTop = Math.max(0, Math.min(rawTop, maxBottom - height));
    const minutesFromDayStart = clampedTop / pxPerMinute;
    const snapped = Math.round(minutesFromDayStart / slotMinutes) * slotMinutes;
    const snappedTop = snapped * pxPerMinute;
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
  const doctor = formatDoctorName(event.doctor);

  // In "All Doctors" view the second line is the doctor's name instead of the
  // time range (client request — the time is less important than *who* the
  // patient is booked with when several doctors share one column). Otherwise
  // it's the usual start–end time.
  const secondaryLine = allDoctorsView && doctor ? doctor : timeRange;

  // Card heights are duration-driven, so a 30-min appointment is only ~34dp
  // tall — not enough vertical space for 4 lines of text. Without these
  // thresholds the bottom lines used to overflow past the card's painted
  // background and visually collide with the next hour's "Tap to book"
  // hint. Show progressively more detail as the card grows.
  const showSecondary = height >= s(34) && !!secondaryLine;
  const showTreatment = height >= s(54) && !!treatment;
  // The dedicated bottom doctor line only appears in per-doctor / single-
  // doctor views, where the doctor isn't already the second line. In
  // All-Doctors view the doctor name is the second line, so we don't repeat it.
  const showDoctor = height >= s(70) && !!doctor && !allDoctorsView;
  const isCancelled = deriveStatus(event) === 'cancelled';

  const panGesture = Gesture.Pan()
    .enabled(!isCancelled)
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
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            backgroundColor: palette.bg,
            borderLeftColor: palette.border,
          },
          animStyle,
        ]}>
        <View style={[styles.statusDot, { backgroundColor: palette.dot }]} />
        <Text style={styles.eventName} numberOfLines={1}>
          {fullName || 'Unknown'}
        </Text>
        {showSecondary ? (
          <Text style={styles.eventTime} numberOfLines={1}>
            {secondaryLine}
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
  // Unconfirmed → single canonical yellow so every unconfirmed card reads
  // as unconfirmed regardless of which clinician owns it. Matches the
  // yellow "Unconfirmed" pill on the Home dashboard (Today's Summary).
  // The previous doctor-hue fallback was cycling four colors and by
  // coincidence produced an emerald tone that looked identical to the
  // confirmed green — which the client flagged as confusing.
  return { border: colors.warning[500], bg: colors.warning[10], dot: colors.warning[500] };
}

function formatMinutes(minutesSinceMidnight: number): string {
  const hour = Math.floor(minutesSinceMidnight / 60);
  const minute = minutesSinceMidnight % 60;
  // Top-of-hour labels carry the meridiem ("10 AM"); intermediate slots
  // get a compact suffix-only label (":30") so they read as a subdivision
  // of the hour above instead of looking like their own row.
  if (minute === 0) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12} ${period}`;
  }
  return `:${String(minute).padStart(2, '0')}`;
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
  // Half-hour markers — same column, dimmer and a touch smaller so the
  // hour labels stay visually dominant and the row reads as a subdivision.
  minorLabel: {
    fontSize: ms(10),
    color: colors.text.disabled ?? colors.text.secondary,
    opacity: 0.65,
  },
  hourLine: {
    flex: 1,
    marginLeft: s(8),
    marginTop: spacing.xs + 2,
    height: 1,
    backgroundColor: colors.border.subtle,
  },
  // Half-hour grid line — fainter than the hourly divider.
  minorLine: {
    opacity: 0.45,
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
    // left + width are set inline per-event so overlapping cards lay out
    // side-by-side instead of stacking on top of each other.
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
