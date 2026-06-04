import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { type AppointmentStatus } from '@/components/status-pill';
import { useAllEvents } from '@/hooks/use-appointments';
import {
  deriveStatus,
  eventsForDate,
  formatEventTime,
  todayYMD,
} from '@/lib/appointments';
import { DEMO_MODE, getMockCalendarEvents } from '@/lib/mock-appointments';
import { ms, s } from '@/lib/responsive';
import { colors, radius, spacing, typography } from '@/theme';
import type { BackendEvent } from '@/types/appointments';

type CalendarView = 'Day' | 'Week' | 'Month';
const VIEWS: CalendarView[] = ['Day', 'Week', 'Month'];

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 20;

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<CalendarView>('Day');
  const bottomTabHeight = useBottomTabBarHeight();
  const { data: liveEvents } = useAllEvents();

  const events = useMemo<BackendEvent[]>(() => {
    if (DEMO_MODE) return getMockCalendarEvents();
    return liveEvents ?? [];
  }, [liveEvents]);

  const ymd = useMemo(() => todayYMD(selectedDate), [selectedDate]);
  const dayEvents = useMemo(() => eventsForDate(events, ymd), [events, ymd]);

  const goPrev = () => {
    setSelectedDate((d) => {
      const next = new Date(d);
      if (view === 'Day') next.setDate(next.getDate() - 1);
      else if (view === 'Week') next.setDate(next.getDate() - 7);
      else next.setMonth(next.getMonth() - 1);
      return next;
    });
  };
  const goNext = () => {
    setSelectedDate((d) => {
      const next = new Date(d);
      if (view === 'Day') next.setDate(next.getDate() + 1);
      else if (view === 'Week') next.setDate(next.getDate() + 7);
      else next.setMonth(next.getMonth() + 1);
      return next;
    });
  };

  const dateLabel = selectedDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Screen
      contentContainerStyle={[styles.container, { paddingBottom: bottomTabHeight + spacing.lg }]}
      edges={['top']}>
      <View style={styles.dateNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={view === 'Week' ? 'Previous week' : view === 'Month' ? 'Previous month' : 'Previous day'}
          onPress={goPrev}
          hitSlop={12}
          style={({ pressed }) => [styles.chevron, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={s(20)} color={colors.neutral[500]} />
        </Pressable>
        <Text style={styles.dateText}>{dateLabel}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={view === 'Week' ? 'Next week' : view === 'Month' ? 'Next month' : 'Next day'}
          onPress={goNext}
          hitSlop={12}
          style={({ pressed }) => [styles.chevron, pressed && styles.pressed]}>
          <Ionicons name="chevron-forward" size={s(20)} color={colors.neutral[500]} />
        </Pressable>
      </View>

      <View style={styles.tabBar}>
        {VIEWS.map((v) => {
          const active = view === v;
          return (
            <Pressable
              key={v}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setView(v)}
              style={[styles.tab, active && styles.tabActive]}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{v}</Text>
            </Pressable>
          );
        })}
      </View>

      {view === 'Day' ? (
        <DayView events={dayEvents} />
      ) : view === 'Week' ? (
        <WeekView
          events={events}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      ) : (
        <MonthView
          events={events}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      )}
    </Screen>
  );
}

function DayView({ events }: { events: BackendEvent[] }) {
  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) arr.push(h);
    return arr;
  }, []);

  const eventsByHour = useMemo(() => {
    const map = new Map<number, BackendEvent[]>();
    for (const e of events) {
      const d = new Date(e.start);
      if (isNaN(d.getTime())) continue;
      const h = d.getHours();
      const list = map.get(h) ?? [];
      list.push(e);
      map.set(h, list);
    }
    return map;
  }, [events]);

  return (
    <View style={styles.dayView}>
      {hours.map((h) => (
        <TimeRow key={h} hour={h} events={eventsByHour.get(h) ?? []} />
      ))}
    </View>
  );
}

function WeekView({
  events,
  selectedDate,
  onSelectDate,
}: {
  events: BackendEvent[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const weekDates = useMemo(() => {
    const start = startOfWeekMonday(selectedDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const selectedYMD = todayYMD(selectedDate);
  const dayEvents = useMemo(
    () => eventsForDate(events, selectedYMD).sort(byStartTime),
    [events, selectedYMD],
  );

  return (
    <View style={styles.weekView}>
      <View style={styles.weekStrip}>
        {weekDates.map((d) => {
          const isActive = todayYMD(d) === selectedYMD;
          const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
          return (
            <Pressable
              key={d.toISOString()}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => onSelectDate(d)}
              style={[styles.dayPill, isActive && styles.dayPillActive]}>
              <Text
                style={[
                  styles.dayPillLabel,
                  isActive && styles.dayPillTextActive,
                ]}>
                {weekday}
              </Text>
              <Text
                style={[
                  styles.dayPillDate,
                  isActive && styles.dayPillTextActive,
                ]}>
                {d.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {dayEvents.length === 0 ? (
        <View style={styles.weekEmpty}>
          <Text style={styles.placeholderText}>No appointments on this day.</Text>
        </View>
      ) : (
        <View style={styles.weekList}>
          {dayEvents.map((e) => (
            <WeekCard key={String(e.extendedProps?.mainId ?? e.id)} event={e} />
          ))}
        </View>
      )}
    </View>
  );
}

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const STATUS_ORDER: AppointmentStatus[] = ['confirmed', 'unconfirmed', 'cancelled'];

function MonthView({
  events,
  selectedDate,
  onSelectDate,
}: {
  events: BackendEvent[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const grid = useMemo(() => buildMonthGrid(selectedDate), [selectedDate]);
  const eventsByYMD = useMemo(() => groupEventsByYMD(events), [events]);
  const selectedYMD = todayYMD(selectedDate);

  return (
    <View style={styles.monthCard}>
      <View style={styles.monthHeaderRow}>
        {WEEKDAY_INITIALS.map((d, i) => (
          <Text key={`${d}-${i}`} style={styles.monthHeaderText}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.monthGrid}>
        {grid.map((week, wi) => (
          <View key={wi} style={styles.monthRow}>
            {week.map((date, di) => {
              if (!date) {
                return <View key={di} style={styles.monthCell} />;
              }
              const ymd = todayYMD(date);
              const isSelected = ymd === selectedYMD;
              const statuses = uniqueStatusesFor(eventsByYMD.get(ymd) ?? []);
              return (
                <Pressable
                  key={di}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => onSelectDate(date)}
                  style={({ pressed }) => [styles.monthCell, pressed && styles.pressed]}>
                  <View style={[styles.monthDateWrap, isSelected && styles.monthDateSelected]}>
                    <Text
                      style={[
                        styles.monthDateText,
                        isSelected && styles.monthDateTextSelected,
                      ]}>
                      {date.getDate()}
                    </Text>
                  </View>
                  {statuses.length > 0 ? (
                    <View style={styles.monthDots}>
                      {statuses.map((status) => (
                        <View
                          key={status}
                          style={[
                            styles.monthDot,
                            { backgroundColor: slotPalette(status).dot },
                          ]}
                        />
                      ))}
                    </View>
                  ) : (
                    <View style={styles.monthDotsPlaceholder} />
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

function buildMonthGrid(date: Date): (Date | null)[][] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = firstOfMonth.getDay();
  const offset = firstWeekday === 0 ? 6 : firstWeekday - 1;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function groupEventsByYMD(events: BackendEvent[]): Map<string, BackendEvent[]> {
  const map = new Map<string, BackendEvent[]>();
  for (const e of events) {
    const key = e.visit_date;
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(e);
    map.set(key, list);
  }
  return map;
}

function uniqueStatusesFor(events: BackendEvent[]): AppointmentStatus[] {
  const present = new Set<AppointmentStatus>();
  for (const e of events) present.add(deriveStatus(e));
  return STATUS_ORDER.filter((s) => present.has(s));
}

function TimeRow({ hour, events }: { hour: number; events: BackendEvent[] }) {
  return (
    <View style={styles.row}>
      <Text style={styles.timeLabel}>{formatHour(hour)}</Text>
      <View style={styles.slotColumn}>
        {events.length === 0 ? (
          <EmptySlot />
        ) : (
          events.map((e) => <SlotCard key={String(e.extendedProps?.mainId ?? e.id)} event={e} />)
        )}
      </View>
    </View>
  );
}

function EmptySlot() {
  return <View style={styles.emptySlot} />;
}

function SlotCard({ event }: { event: BackendEvent }) {
  const status = deriveStatus(event);
  const palette = slotPalette(status);
  const fullName = `${(event.name ?? '').trim()} ${(event.family ?? '').trim()}`.trim();
  const timeRange = `${formatEventTime(event.start)} - ${formatEventTime(event.end)}`;
  const treatment = event.extendedProps?.procedure ?? '';
  const doctor = event.doctor ? `Dr. ${event.doctor}` : '';

  return (
    <View
      style={[
        styles.slotCard,
        { backgroundColor: palette.bg, borderLeftColor: palette.border },
      ]}>
      <View style={[styles.statusDot, { backgroundColor: palette.dot }]} />
      <Text style={styles.slotName} numberOfLines={1}>
        {fullName || 'Unknown'}
      </Text>
      <Text style={styles.slotTime}>{timeRange}</Text>
      {treatment ? <Text style={styles.slotTreatment}>{treatment}</Text> : null}
      {doctor ? <Text style={styles.slotDoctor}>{doctor}</Text> : null}
    </View>
  );
}

function WeekCard({ event }: { event: BackendEvent }) {
  const status = deriveStatus(event);
  const palette = slotPalette(status);
  const fullName = `${(event.name ?? '').trim()} ${(event.family ?? '').trim()}`.trim();
  const procedure = event.extendedProps?.procedure ?? '';
  const subtitle = procedure
    ? `${formatEventTime(event.start)} - ${procedure}`
    : formatEventTime(event.start);

  return (
    <View
      style={[
        styles.weekCard,
        { backgroundColor: palette.bg, borderLeftColor: palette.border },
      ]}>
      <View style={[styles.statusDot, { backgroundColor: palette.dot }]} />
      <Text style={styles.slotName} numberOfLines={1}>
        {fullName || 'Unknown'}
      </Text>
      <Text style={styles.slotTime}>{subtitle}</Text>
    </View>
  );
}

function slotPalette(status: AppointmentStatus): {
  border: string;
  bg: string;
  dot: string;
} {
  switch (status) {
    case 'confirmed':
      return { border: colors.success[500], bg: colors.success[0], dot: colors.success[500] };
    case 'cancelled':
      return { border: colors.danger[500], bg: colors.danger[10], dot: colors.danger[500] };
    case 'unconfirmed':
    default:
      return { border: colors.warning[400], bg: colors.warning[10], dot: colors.warning[400] };
  }
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:00 ${period}`;
}

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function byStartTime(a: BackendEvent, b: BackendEvent): number {
  return new Date(a.start).getTime() - new Date(b.start).getTime();
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  chevron: {
    padding: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
  dateText: {
    ...typography.title.medium,
    fontFamily: 'Inter_600SemiBold',
    color: colors.neutral[500],
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background.surface,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.background.base,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    ...typography.label.medium,
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.neutral[500],
    fontFamily: 'Inter_600SemiBold',
  },
  dayView: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  timeLabel: {
    width: s(64),
    paddingTop: spacing.sm,
    ...typography.body.medium,
    color: colors.text.secondary,
    textAlign: 'left',
  },
  slotColumn: {
    flex: 1,
    gap: spacing.sm,
  },
  emptySlot: {
    minHeight: s(48),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border.subtle,
    borderRadius: radius.lg,
    backgroundColor: 'transparent',
  },
  slotCard: {
    borderLeftWidth: 4,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingRight: spacing.xl,
    gap: 2,
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: s(8),
    height: s(8),
    borderRadius: radius.pill,
  },
  slotName: {
    ...typography.title.medium,
    fontFamily: 'Inter_600SemiBold',
    color: colors.neutral[500],
  },
  slotTime: {
    ...typography.body.medium,
    color: colors.text.secondary,
  },
  slotTreatment: {
    ...typography.body.medium,
    fontFamily: 'Inter_600SemiBold',
    color: colors.neutral[500],
    marginTop: 2,
  },
  slotDoctor: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  weekView: {
    gap: spacing.lg,
  },
  weekStrip: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dayPill: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.background.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayPillActive: {
    backgroundColor: colors.primary[500],
  },
  dayPillLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: ms(11),
    color: colors.text.secondary,
  },
  dayPillDate: {
    fontFamily: 'Inter_700Bold',
    fontSize: ms(16),
    color: colors.neutral[500],
  },
  dayPillTextActive: {
    color: colors.text.inverse,
  },
  weekList: {
    gap: spacing.md,
  },
  weekCard: {
    borderLeftWidth: 4,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingRight: spacing.xl,
    gap: 2,
    position: 'relative',
  },
  weekEmpty: {
    paddingVertical: spacing.huge,
    alignItems: 'center',
  },
  placeholder: {
    paddingVertical: spacing.huge,
    alignItems: 'center',
  },
  placeholderText: {
    ...typography.body.large,
    color: colors.text.secondary,
  },
  monthCard: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.background.base,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#EFF5FC',
    paddingVertical: spacing.sm,
  },
  monthHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Inter_500Medium',
    fontSize: ms(13),
    color: colors.text.secondary,
  },
  monthGrid: {
    paddingVertical: spacing.sm,
  },
  monthRow: {
    flexDirection: 'row',
  },
  monthCell: {
    flex: 1,
    minHeight: s(56),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  monthDateWrap: {
    width: s(32),
    height: s(32),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  monthDateSelected: {
    backgroundColor: colors.primary[500],
  },
  monthDateText: {
    fontFamily: 'Inter_500Medium',
    fontSize: ms(15),
    color: colors.neutral[500],
  },
  monthDateTextSelected: {
    color: colors.text.inverse,
    fontFamily: 'Inter_600SemiBold',
  },
  monthDots: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
    height: s(6),
  },
  monthDotsPlaceholder: {
    height: s(6),
    marginTop: 4,
  },
  monthDot: {
    width: s(6),
    height: s(6),
    borderRadius: radius.pill,
  },
});
