import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppointmentPopover } from '@/components/appointment-popover';
import { DoctorPicker } from '@/components/doctor-picker';
import { DraggableDayTimeline } from '@/components/draggable-day-timeline';
import { Screen } from '@/components/screen';
import { type AppointmentStatus } from '@/components/status-pill';
import { useAllEvents } from '@/hooks/use-appointments';
import { useMappedDoctors } from '@/hooks/use-mapped-doctors';
import { useUpdateAppointment } from '@/hooks/use-update-appointment';
import {
  deriveStatus,
  eventMatchesDoctor,
  eventsForDate,
  formatEventTime,
  todayYMD,
} from '@/lib/appointments';
import { DEMO_MODE, getMockCalendarEvents } from '@/lib/mock-appointments';
import { ms, s } from '@/lib/responsive';
import { useAuthStore } from '@/store/auth';
import { useDoctorFilterStore } from '@/store/doctor-filter';
import { useNewAppointmentStore } from '@/store/new-appointment';
import { colors, radius, spacing, typography } from '@/theme';
import type { BackendEvent, UpdateAppointmentRequest } from '@/types/appointments';
import type { Doctor, MappedDoctor } from '@/types/doctors';

type CalendarView = 'Day' | 'Week' | 'Month';
const VIEWS: CalendarView[] = ['Day', 'Week', 'Month'];

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 20;

export default function CalendarScreen() {
  const router = useRouter();
  const setNewAppointmentPrefill = useNewAppointmentStore((s) => s.setPrefill);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<CalendarView>('Day');
  const [activeEvent, setActiveEvent] = useState<BackendEvent | null>(null);
  const selectedDoctorId = useDoctorFilterStore((s) => s.selectedDoctorId);
  const setSelectedDoctorId = useDoctorFilterStore((s) => s.setSelectedDoctorId);
  const bottomTabHeight = useBottomTabBarHeight();
  const safeBottomPadding = Math.max(bottomTabHeight, 80) + spacing.xxl;
  const { data: liveEvents } = useAllEvents();
  const { data: mappedDoctors } = useMappedDoctors();
  const user = useAuthStore((s) => s.user);
  const updateAppointment = useUpdateAppointment();

  // DoctorPicker still expects a Doctor shape. MappedDoctor has a single
  // `name` field (the full display name) — fit it into Doctor by putting
  // the full name in `name` and leaving `family` blank. The picker renders
  // `Dr. ${name} ${family}` which collapses to `Dr. ${name}`.
  const doctors: Doctor[] = useMemo(
    () => (mappedDoctors ?? []).map((d) => ({ id: d.id, name: d.name, family: '' })),
    [mappedDoctors],
  );

  const openNewAppointment = (hourOverride?: number) => {
    const doctor: MappedDoctor | null =
      selectedDoctorId != null
        ? (mappedDoctors ?? []).find((d) => d.id === selectedDoctorId) ?? null
        : null;
    const now = new Date();
    const hour = hourOverride ?? now.getHours();
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const yyyy = selectedDate.getFullYear();
    const startHh = String(hour).padStart(2, '0');
    const endHh = String((hour + 1) % 24).padStart(2, '0');
    setNewAppointmentPrefill({
      date: `${dd}-${mm}-${yyyy}`,
      startTime: `${startHh}:00`,
      endTime: `${endHh}:00`,
      doctorId: doctor?.id ?? null,
      doctorName: doctor?.name ?? null,
    });
    router.push('/appointment-new' as never);
  };

  // Non-owner doctors only ever see their own appointments (backend enforced).
  // The picker is irrelevant for them, so it's hidden and no client-side filter
  // is applied. Everyone else (owner doctors, assistants, admins) gets the
  // picker with "All Doctors" as the default.
  const showDoctorPicker = !(user?.role === 'DOCTOR' && !user.is_owner);

  const allEvents = useMemo<BackendEvent[]>(() => {
    if (DEMO_MODE) return getMockCalendarEvents();
    return liveEvents ?? [];
  }, [liveEvents]);

  const events = useMemo<BackendEvent[]>(() => {
    if (!showDoctorPicker || selectedDoctorId === null) return allEvents;
    return allEvents.filter((e) => eventMatchesDoctor(e, selectedDoctorId));
  }, [allEvents, selectedDoctorId, showDoctorPicker]);

  // Drag-and-drop reschedule from the Day timeline. The new start comes from
  // the timeline component (already snapped to 15-min). We keep the duration
  // identical to the original, ask the user to confirm (drag-drop on a small
  // screen is easy to trigger by accident), then fire the same /encounter
  // update mutation the Edit / Reschedule modal uses.
  const handleReschedule = (event: BackendEvent, newStart: Date) => {
    const originalStart = new Date(event.start);
    const originalEnd = new Date(event.end);
    if (isNaN(originalStart.getTime()) || isNaN(originalEnd.getTime())) return;
    const durationMs = originalEnd.getTime() - originalStart.getTime();
    const newEnd = new Date(newStart.getTime() + durationMs);
    const prettyOld = `${formatEventTime(event.start)} - ${formatEventTime(event.end)}`;
    const prettyNew = `${formatEventTime(newStart.toISOString())} - ${formatEventTime(newEnd.toISOString())}`;

    Alert.alert(
      'Reschedule appointment',
      `Move from ${prettyOld} to ${prettyNew}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reschedule',
          onPress: async () => {
            const dateIso = isoDate(newStart);
            const payload: UpdateAppointmentRequest = {
              eventId: event.id,
              name: event.name ?? '',
              family: event.family ?? '',
              dob: normalizeDob(event.dob ?? ''),
              phone: ensureLeadingPlus(event.phone ?? ''),
              date: dateIso,
              start_iso: toTzAwareIso(newStart),
              end_iso: toTzAwareIso(newEnd),
              proc: event.extendedProps?.procedure ?? '',
              resourceId: Number(event.resourceId),
              doctor_name: event.doctor ?? '',
              booking_reminder: false,
            };
            try {
              const res = await updateAppointment.mutateAsync(payload);
              if (res.status !== 'success') {
                Alert.alert('Could not reschedule', res.message || 'Try again.');
              }
            } catch (err) {
              Alert.alert(
                'Could not reschedule',
                err instanceof Error ? err.message : 'Try again.',
              );
            }
          },
        },
      ],
    );
  };

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
      contentContainerStyle={[styles.container, { paddingBottom: safeBottomPadding }]}
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

      {showDoctorPicker && doctors && doctors.length > 0 ? (
        <DoctorPicker
          doctors={doctors}
          selectedDoctorId={selectedDoctorId}
          onSelect={setSelectedDoctorId}
        />
      ) : null}

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
        <DraggableDayTimeline
          events={dayEvents}
          selectedDate={selectedDate}
          dayStartHour={DAY_START_HOUR}
          dayEndHour={DAY_END_HOUR}
          onSelectEvent={setActiveEvent}
          onSelectEmpty={openNewAppointment}
          onReschedule={handleReschedule}
        />
      ) : view === 'Week' ? (
        <WeekView
          events={events}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onSelectEvent={setActiveEvent}
          onAddAppointment={() => openNewAppointment(DAY_START_HOUR)}
        />
      ) : (
        <MonthView
          events={events}
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            // Match the web flow: tapping a date in Month view drops the
            // user into the Day view for that date so they can see (and
            // act on) the appointments. Tapping an empty date lands them
            // on Day view ready to book.
            setSelectedDate(date);
            setView('Day');
          }}
          onAddAppointment={(date) => {
            setSelectedDate(date);
            openNewAppointment(DAY_START_HOUR);
          }}
        />
      )}

      <AppointmentPopover event={activeEvent} onClose={() => setActiveEvent(null)} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Book new appointment"
        onPress={() => openNewAppointment()}
        style={({ pressed }) => [
          styles.fab,
          { bottom: bottomTabHeight + spacing.lg },
          pressed && styles.pressed,
        ]}>
        <Ionicons name="add" size={ms(28)} color="#FFFFFF" />
      </Pressable>
    </Screen>
  );
}

// DayView removed — replaced by the continuous DraggableDayTimeline.
// Drag-and-drop reschedule requires a continuous y-axis; the previous
// hour-bucketed layout couldn't support it.

function WeekView({
  events,
  selectedDate,
  onSelectDate,
  onSelectEvent,
  onAddAppointment,
}: {
  events: BackendEvent[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (event: BackendEvent) => void;
  onAddAppointment: () => void;
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Book an appointment on this day"
          onPress={onAddAppointment}
          style={({ pressed }) => [
            styles.weekEmpty,
            styles.weekEmptyTappable,
            pressed && styles.pressed,
          ]}>
          <Ionicons name="add-circle-outline" size={ms(22)} color={colors.primary[500]} />
          <Text style={styles.weekEmptyTappableText}>
            Tap to book an appointment on this day
          </Text>
        </Pressable>
      ) : (
        <View style={styles.weekList}>
          {dayEvents.map((e) => (
            <WeekCard
              key={String(e.extendedProps?.mainId ?? e.id)}
              event={e}
              onPress={() => onSelectEvent(e)}
            />
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Book another appointment on this day"
            onPress={onAddAppointment}
            style={({ pressed }) => [styles.weekAddRow, pressed && styles.pressed]}>
            <Ionicons name="add-circle-outline" size={ms(20)} color={colors.primary[500]} />
            <Text style={styles.weekAddText}>Book another appointment</Text>
          </Pressable>
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
  onAddAppointment,
}: {
  events: BackendEvent[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onAddAppointment: (date: Date) => void;
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
              const hasEvents = (eventsByYMD.get(ymd) ?? []).length > 0;
              return (
                <Pressable
                  key={di}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={
                    hasEvents
                      ? `Open appointments on ${date.toDateString()}`
                      : `Open ${date.toDateString()} to book`
                  }
                  // Always switch to Day view on tap so the user can see
                  // existing cards (tap → Actions popover) or empty slots
                  // (tap → new appointment). Mirrors the web flow where
                  // clicking any date drops you into a slot-level view.
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
                            { backgroundColor: statusPalette(status).dot },
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

// TimeRow / EmptySlot / SlotCard were replaced by DraggableDayTimeline +
// DraggableEventCard in components/draggable-day-timeline.tsx, which uses
// a continuous-pixel y-axis so long-press drag-and-drop can reschedule
// against real time geometry instead of discrete hour buckets.

function WeekCard({ event, onPress }: { event: BackendEvent; onPress: () => void }) {
  const procedure = event.extendedProps?.procedure ?? '';
  const palette = paletteForEvent(event);
  const fullName = `${(event.name ?? '').trim()} ${(event.family ?? '').trim()}`.trim();
  const subtitle = procedure
    ? `${formatEventTime(event.start)} - ${procedure}`
    : formatEventTime(event.start);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open appointment for ${fullName || 'patient'}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.weekCard,
        { backgroundColor: palette.bg, borderLeftColor: palette.border },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.statusDot, { backgroundColor: palette.dot }]} />
      <Text style={styles.slotName} numberOfLines={1}>
        {fullName || 'Unknown'}
      </Text>
      <Text style={styles.slotTime}>{subtitle}</Text>
    </Pressable>
  );
}

// Calendar cards are colour-coded by DOCTOR so multi-doctor schedules are
// easy to scan at a glance. We mirror the web app's exact hash function
// (`colorForDoctor` in pages/Calendar/Calendar.jsx) so a given doctor's
// colour stays identical across web and mobile. The card background is the
// same colour at 12% opacity to keep the text readable.
function doctorPalette(doctorName: string | null | undefined): {
  border: string;
  bg: string;
  dot: string;
} {
  const name = (doctorName ?? '').trim() || 'Doctor';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const r = (hash >> 0) & 0xff;
  const g = (hash >> 8) & 0xff;
  const b = (hash >> 16) & 0xff;
  return {
    border: `rgb(${r}, ${g}, ${b})`,
    dot: `rgb(${r}, ${g}, ${b})`,
    bg: `rgba(${r}, ${g}, ${b}, 0.12)`,
  };
}

function statusPalette(status: AppointmentStatus): { border: string; bg: string; dot: string } {
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

// Confirmed = green, Cancelled = red — matches the web app's
// .app-confirmed / .app_cancelled rules. Anything not explicitly
// confirmed or cancelled falls back to the per-doctor palette.
function paletteForEvent(event: BackendEvent): { border: string; bg: string; dot: string } {
  const status = deriveStatus(event);
  if (status === 'confirmed' || status === 'cancelled') {
    return statusPalette(status);
  }
  return doctorPalette(event.doctor);
}

// Reschedule helpers. Backend stores DOB as "DD-Month-YYYY" so re-sending
// it untouched would fail the patient lookup in /encounter; normalize back
// to YYYY-MM-DD. Phone numbers are stored with a leading "+" so /encounter
// matches against "+961…" exactly. start_iso / end_iso must be tz-aware so
// the backend doesn't lose the local-time intent across timezone boundaries.
function normalizeDob(dob: string): string {
  if (!dob) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) return dob;
  const parts = dob.split('-');
  if (parts.length !== 3) return dob;
  const [dd, monthName, yyyy] = parts;
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const idx = months.findIndex((m) => m.toLowerCase() === monthName.toLowerCase());
  if (idx < 0) return dob;
  return `${yyyy}-${String(idx + 1).padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

function ensureLeadingPlus(phone: string): string {
  const trimmed = (phone ?? '').trim();
  if (!trimmed) return '';
  return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
}

function isoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toTzAwareIso(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const oh = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, '0');
  const om = String(Math.abs(offsetMin) % 60).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00${sign}${oh}:${om}`;
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
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: s(56),
    height: s(56),
    borderRadius: s(28),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[500],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  // Used by WeekCard (still rendered inline by the Week view).
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
  weekEmptyTappable: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border.subtle,
    borderRadius: radius.lg,
    justifyContent: 'center',
  },
  weekEmptyTappableText: {
    ...typography.body.large,
    color: colors.primary[500],
    fontFamily: 'Inter_500Medium',
  },
  weekAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border.subtle,
    borderRadius: radius.lg,
    marginTop: spacing.xs,
  },
  weekAddText: {
    ...typography.body.medium,
    color: colors.primary[500],
    fontFamily: 'Inter_500Medium',
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
