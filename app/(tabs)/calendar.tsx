import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { AppointmentPopover } from '@/components/appointment-popover';
import { DoctorPicker } from '@/components/doctor-picker';
import { DraggableDayTimeline } from '@/components/draggable-day-timeline';
import { Screen } from '@/components/screen';
import { type AppointmentStatus } from '@/components/status-pill';
import { useAllEvents } from '@/hooks/use-appointments';
import { useClinicSchedule } from '@/hooks/use-clinic-schedule';
import { useMappedDoctors } from '@/hooks/use-mapped-doctors';
import { useUpdateAppointment } from '@/hooks/use-update-appointment';
import {
  deriveStatus,
  eventMatchesDoctor,
  eventsForDate,
  formatDoctorName,
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

  // Patient-cancelled appointments render red and are read-only in the web
  // app — tapping one does nothing there. Mirror that: swallow the tap so no
  // popover opens for a cancelled event, whichever view it came from.
  const handleSelectEvent = useCallback((event: BackendEvent) => {
    if (deriveStatus(event) === 'cancelled') return;
    setActiveEvent(event);
  }, []);
  const { data: liveEvents, refetch: refetchEvents } = useAllEvents();
  const { data: mappedDoctors } = useMappedDoctors();
  const { data: schedule } = useClinicSchedule();
  const slotMinutes = schedule?.slotMinutes ?? 60;
  const dayStartHour = schedule?.startHour ?? DAY_START_HOUR;
  const dayEndHour = schedule?.endHour ?? DAY_END_HOUR;
  const user = useAuthStore((s) => s.user);
  const updateAppointment = useUpdateAppointment();

  // Socket events keep the calendar live for anything done through the app, but
  // they can't cover everything: a booking removed directly in the database
  // emits nothing, and any event sent while the socket was down is simply lost.
  // This tab never unmounts, so without a focus refetch those cases persisted
  // until the user signed out and back in. Same pattern as the billing and
  // reports tabs.
  useFocusEffect(
    useCallback(() => {
      refetchEvents();
    }, [refetchEvents]),
  );

  // DoctorPicker still expects a Doctor shape. MappedDoctor has a single
  // `name` field (the full display name) — fit it into Doctor by putting
  // the full name in `name` and leaving `family` blank. The picker shows the
  // name verbatim (no forced "Dr" honorific).
  const doctors: Doctor[] = useMemo(
    () => (mappedDoctors ?? []).map((d) => ({ id: d.id, name: d.name, family: '' })),
    [mappedDoctors],
  );

  const openNewAppointment = (hourFloatOverride?: number) => {
    const doctor: MappedDoctor | null =
      selectedDoctorId != null
        ? (mappedDoctors ?? []).find((d) => d.id === selectedDoctorId) ?? null
        : null;
    const now = new Date();
    const hourFloat = hourFloatOverride ?? now.getHours();
    // Snap to the clinic's configured slot grid so the prefilled times match
    // the calendar grid the user just tapped (e.g. 30-min slots → 09:30, 10:00).
    const startMin = Math.floor((hourFloat * 60) / slotMinutes) * slotMinutes;
    const endMin = startMin + slotMinutes;
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const yyyy = selectedDate.getFullYear();
    const toHhMm = (m: number) =>
      `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    setNewAppointmentPrefill({
      date: `${dd}-${mm}-${yyyy}`,
      startTime: toHhMm(startMin),
      endTime: toHhMm(endMin),
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

  // "All Doctors" is active only when the picker is relevant, no single doctor
  // is selected, and the clinic actually has more than one doctor. In that mode
  // the Day/Week cards surface the doctor's name so it's clear who each
  // appointment belongs to.
  const isAllDoctorsView =
    showDoctorPicker && selectedDoctorId === null && doctors.length > 1;

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
              // Dragging an appointment to a new slot is a reschedule, so tell
              // the backend to send the patient a fresh WhatsApp confirmation
              // (booking_reminder=true is the same flag the web reschedule
              // uses; the backend skips the send when nothing actually
              // changed, so this never double-notifies).
              booking_reminder: true,
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

  // Day-view header uses the full weekday prefix ("Wed, June 30, 2026") per
  // client feedback so the current day of the week is always visible. Week
  // and Month views stay on the shorter format since the weekday isn't the
  // primary anchor there.
  const dateLabel =
    view === 'Day'
      ? selectedDate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : selectedDate.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });

  const isOnToday = useMemo(() => {
    const now = new Date();
    return (
      selectedDate.getFullYear() === now.getFullYear() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getDate() === now.getDate()
    );
  }, [selectedDate]);

  const jumpToToday = () => {
    setSelectedDate(new Date());
  };

  // Horizontal swipe → advance the calendar by one unit in the active view
  // (day / week / month). activeOffsetX only fires the gesture once the
  // finger has moved ≥ 20dp horizontally, and failOffsetY bails as soon as
  // vertical movement dominates — that keeps vertical scroll on the day
  // timeline and the long-press drag on event cards working normally.
  const SWIPE_TRIGGER = 60;
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (e.translationX <= -SWIPE_TRIGGER) {
        runOnJS(goNext)();
      } else if (e.translationX >= SWIPE_TRIGGER) {
        runOnJS(goPrev)();
      }
    });

  return (
    <View style={styles.root}>
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
        <Text style={[styles.dateText, isOnToday && styles.dateTextToday]}>{dateLabel}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={view === 'Week' ? 'Next week' : view === 'Month' ? 'Next month' : 'Next day'}
          onPress={goNext}
          hitSlop={12}
          style={({ pressed }) => [styles.chevron, pressed && styles.pressed]}>
          <Ionicons name="chevron-forward" size={s(20)} color={colors.neutral[500]} />
        </Pressable>
      </View>

      {!isOnToday ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Jump to today"
          onPress={jumpToToday}
          style={({ pressed }) => [styles.todayChip, pressed && styles.pressed]}>
          <Ionicons name="today-outline" size={ms(14)} color={colors.primary[500]} />
          <Text style={styles.todayChipLabel}>Today</Text>
        </Pressable>
      ) : null}

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

      <GestureDetector gesture={swipeGesture}>
        <View>
          {view === 'Day' ? (
        <DraggableDayTimeline
          events={dayEvents}
          selectedDate={selectedDate}
          dayStartHour={dayStartHour}
          dayEndHour={dayEndHour}
          slotMinutes={slotMinutes}
          allDoctorsView={isAllDoctorsView}
          onSelectEvent={handleSelectEvent}
          onSelectEmpty={openNewAppointment}
          onReschedule={handleReschedule}
        />
      ) : view === 'Week' ? (
        <WeekView
          events={events}
          selectedDate={selectedDate}
          allDoctorsView={isAllDoctorsView}
          onSelectDate={setSelectedDate}
          onSelectEvent={handleSelectEvent}
          onAddAppointment={() => openNewAppointment(dayStartHour)}
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
            openNewAppointment(dayStartHour);
          }}
        />
      )}
        </View>
      </GestureDetector>

      </Screen>

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
    </View>
  );
}

// DayView removed — replaced by the continuous DraggableDayTimeline.
// Drag-and-drop reschedule requires a continuous y-axis; the previous
// hour-bucketed layout couldn't support it.

function WeekView({
  events,
  selectedDate,
  allDoctorsView,
  onSelectDate,
  onSelectEvent,
  onAddAppointment,
}: {
  events: BackendEvent[];
  selectedDate: Date;
  allDoctorsView: boolean;
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
              allDoctorsView={allDoctorsView}
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

function WeekCard({
  event,
  allDoctorsView,
  onPress,
}: {
  event: BackendEvent;
  allDoctorsView: boolean;
  onPress: () => void;
}) {
  const procedure = event.extendedProps?.procedure ?? '';
  const palette = paletteForEvent(event);
  const fullName = `${(event.name ?? '').trim()} ${(event.family ?? '').trim()}`.trim();
  const subtitle = procedure
    ? `${formatEventTime(event.start)} - ${procedure}`
    : formatEventTime(event.start);
  // Week view keeps the start time and adds the doctor's name on its own line
  // beneath it when viewing All Doctors (client request).
  const doctor = allDoctorsView ? formatDoctorName(event.doctor) : '';

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
      {doctor ? (
        <Text style={styles.slotDoctor} numberOfLines={1}>
          {doctor}
        </Text>
      ) : null}
    </Pressable>
  );
}

// Calendar cards are colour-coded by DOCTOR so multi-doctor schedules are
// easy to scan at a glance. We mirror the web app's exact hash function
// (`colorForDoctor` in pages/Calendar/Calendar.jsx) so a given doctor's
// colour stays identical across web and mobile. The card background is the
// same colour at 12% opacity to keep the text readable.
function statusPalette(status: AppointmentStatus): { border: string; bg: string; dot: string } {
  switch (status) {
    case 'confirmed':
      return { border: colors.success[500], bg: colors.success[0], dot: colors.success[500] };
    case 'cancelled':
      return { border: colors.danger[500], bg: colors.danger[10], dot: colors.danger[500] };
    case 'unconfirmed':
    default:
      // Same warning[500] the timeline uses so Day view and Week/Month cards
      // render an identical yellow for unconfirmed status.
      return { border: colors.warning[500], bg: colors.warning[10], dot: colors.warning[500] };
  }
}

// Confirmed = green, Cancelled = red, Unconfirmed = yellow (single tone).
// Unconfirmed used to fall through to a per-doctor hue palette which
// cycled through emerald / amber / indigo / violet — the emerald looked
// almost identical to the confirmed green, which the client flagged as
// confusing (same status, different colors depending on the doctor's
// name). Anchor all three statuses to the shared statusPalette so the
// day-summary badges and the calendar cards line up 1:1.
function paletteForEvent(event: BackendEvent): { border: string; bg: string; dot: string } {
  return statusPalette(deriveStatus(event));
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
  // Outer wrapper so the floating "+" FAB can be a sibling of the
  // scrollable Screen instead of a child of its inner ScrollView. Without
  // this the FAB scrolled with the timeline and disappeared off-screen.
  root: {
    flex: 1,
  },
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
    textAlign: 'center',
  },
  // Tints the header date when the user is viewing today, so the "you are
  // on today" state is legible even without the separate Today chip.
  dateTextToday: {
    color: colors.primary[500],
  },
  // Compact chip beneath the date-nav row; only rendered when the user has
  // navigated off today. Tapping it jumps back to the current date in the
  // active view (Day/Week/Month).
  todayChip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[0],
  },
  todayChipLabel: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    fontSize: ms(12),
    color: colors.primary[500],
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
  // Doctor name line under the time in Week view's All-Doctors mode. Slightly
  // smaller than the time line so it reads as a secondary detail.
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
