import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppointmentCard } from '@/components/appointment-card';
import { DoctorPicker } from '@/components/doctor-picker';
import { LinkText } from '@/components/link-text';
import { ChatButton } from '@/components/chat-button';
import { NotificationButton } from '@/components/notification-button';
import { ProfileButton } from '@/components/profile-button';
import { Screen } from '@/components/screen';
import { SummaryCard } from '@/components/summary-card';
import { useAllEvents } from '@/hooks/use-appointments';
import { useAuthorizedPages } from '@/hooks/use-authorized-pages';
import { useMappedDoctors } from '@/hooks/use-mapped-doctors';
import { usePatientChats } from '@/hooks/use-patient-chats';
import type { Doctor } from '@/types/doctors';
import {
  eventToAppointmentItem,
  eventMatchesDoctor,
  eventsForDate,
  sortAppointmentsByTime,
  summarize,
  todayYMD,
} from '@/lib/appointments';
import { formatLongDate } from '@/lib/greeting';
import {
  DEMO_MODE,
  MOCK_APPOINTMENTS,
  MOCK_SUMMARY,
  getMockCalendarEvents,
} from '@/lib/mock-appointments';
import { useAuthStore } from '@/store/auth';
import { useDoctorFilterStore } from '@/store/doctor-filter';
import { countChatUnread, useChatUnreadStore } from '@/store/chat-unread';
import { useNotificationsStore } from '@/store/notifications';
import { colors, spacing, typography } from '@/theme';

const DASHBOARD_VISIBLE = 4;

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const bottomTabHeight = useBottomTabBarHeight();
  const safeBottomPadding = Math.max(bottomTabHeight, 80) + spacing.xxl;
  const { data: events, isLoading, isError, refetch, isRefetching } = useAllEvents();
  const { data: mappedDoctors } = useMappedDoctors();
  const doctors: Doctor[] = useMemo(
    () => (mappedDoctors ?? []).map((d) => ({ id: d.id, name: d.name, family: '' })),
    [mappedDoctors],
  );
  const selectedDoctorId = useDoctorFilterStore((s) => s.selectedDoctorId);
  const setSelectedDoctorId = useDoctorFilterStore((s) => s.setSelectedDoctorId);
  const hasUnreadNotifications = useNotificationsStore((s) =>
    s.items.some((it) => !it.read),
  );
  // "New messages" badge for the Chat button. Unread = threads whose newest
  // message is newer than the last time the user opened Patient Chats. The
  // marker is persisted + loaded on mount (hydrate), and baselined to the
  // newest message on first ever load so we don't flash a badge for existing
  // history. Live socket messages flow into this same ['chats'] cache.
  const { data: chatThreads } = usePatientChats();
  const chatHydrated = useChatUnreadStore((s) => s.hydrated);
  const chatLastSeen = useChatUnreadStore((s) => s.lastSeenTs);
  const hydrateChatSeen = useChatUnreadStore((s) => s.hydrate);
  const baselineChatSeen = useChatUnreadStore((s) => s.baselineIfUnset);

  useEffect(() => {
    hydrateChatSeen();
  }, [hydrateChatSeen]);

  useEffect(() => {
    if (chatHydrated && chatThreads && chatThreads.length > 0) {
      baselineChatSeen(chatThreads);
    }
  }, [chatHydrated, chatThreads, baselineChatSeen]);

  const chatUnread = useMemo(
    () => (chatHydrated && chatThreads ? countChatUnread(chatThreads, chatLastSeen) : 0),
    [chatHydrated, chatThreads, chatLastSeen],
  );

  // Page permissions (same access the clinic admin set on the web). Gate the
  // Chat button here and, if the user isn't allowed Home at all, send them to
  // their first allowed tab.
  const { can, firstAllowedTab } = useAuthorizedPages();

  // Same rule as the Calendar: non-owner doctors don't get the picker — they
  // only ever see their own appointments and any filter would be a no-op.
  const showDoctorPicker = !(user?.role === 'DOCTOR' && !user.is_owner);

  const { dateLabel, today } = useMemo(() => {
    const now = new Date();
    return {
      dateLabel: formatLongDate(now),
      today: todayYMD(now),
    };
  }, []);

  // Live data — filter source events by selected doctor before deriving summary
  // and today's list, so all three pieces (counts, list, calendar) stay in sync.
  const liveFilteredEvents = useMemo(() => {
    const all = events ?? [];
    if (!showDoctorPicker || selectedDoctorId === null) return all;
    return all.filter((e) => eventMatchesDoctor(e, selectedDoctorId));
  }, [events, selectedDoctorId, showDoctorPicker]);
  const liveSummary = useMemo(
    () => summarize(liveFilteredEvents, today),
    [liveFilteredEvents, today],
  );
  const liveAppointments = useMemo(() => {
    const todays = eventsForDate(liveFilteredEvents, today).map(eventToAppointmentItem);
    return sortAppointmentsByTime(todays).slice(0, DASHBOARD_VISIBLE);
  }, [liveFilteredEvents, today]);

  // Demo data — when a specific doctor is picked, derive counts + list from
  // the same mock calendar events so the picker actually changes the display.
  // With "All Doctors" selected we keep the richer curated MOCK_SUMMARY +
  // MOCK_APPOINTMENTS so the default demo view still looks populated.
  const demoData = useMemo(() => {
    if (selectedDoctorId === null) {
      return {
        summary: MOCK_SUMMARY,
        appointments: MOCK_APPOINTMENTS.slice(0, DASHBOARD_VISIBLE),
      };
    }
    const filtered = getMockCalendarEvents().filter((e) => eventMatchesDoctor(e, selectedDoctorId));
    return {
      summary: summarize(filtered, today),
      appointments: sortAppointmentsByTime(
        eventsForDate(filtered, today).map(eventToAppointmentItem),
      ).slice(0, DASHBOARD_VISIBLE),
    };
  }, [selectedDoctorId, today]);

  const summary = DEMO_MODE ? demoData.summary : liveSummary;
  const appointments = DEMO_MODE ? demoData.appointments : liveAppointments;

  const displayName = (user?.user_name ?? '').trim();
  const isDoctor = user?.role === 'DOCTOR';
  // Some backend user names already carry the honorific (e.g. "Dr. Sarah
  // Mitchell"); prepend "Dr" only when it isn't already there so we never
  // render "Hi Dr Dr. …" (mirrors the guard the Profile screen uses).
  const alreadyHonorific = /^Dr\.?\s/i.test(displayName);
  const greetingName = displayName
    ? isDoctor && !alreadyHonorific
      ? `Dr ${displayName}`
      : displayName
    : 'there';
  const showLoading = !DEMO_MODE && isLoading && !events;
  const showError = !DEMO_MODE && isError;
  const showEmpty = !DEMO_MODE && !showLoading && !showError && appointments.length === 0;
  const showList = DEMO_MODE || (!showLoading && !showError && appointments.length > 0);

  // This user's role isn't granted the Home/dashboard page: send them to their
  // first allowed tab. (The tab bar already hides Home in that case; this
  // covers the default landing + any direct navigation here.)
  if (!can('dashboard')) {
    const target = firstAllowedTab();
    if (target) return <Redirect href={target} />;
  }

  return (
    <Screen
      contentContainerStyle={[styles.container, { paddingBottom: safeBottomPadding }]}
      edges={['top']}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{`Hi ${greetingName}!`}</Text>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
        </View>
        <View style={styles.headerActions}>
          {can('patient_chats') ? (
            <ChatButton
              unread={chatUnread}
              onPress={() => router.push('/patient-chats' as never)}
            />
          ) : null}
          <NotificationButton
            hasUnread={hasUnreadNotifications}
            onPress={() => router.push('/(tabs)/(home)/notifications' as never)}
          />
          <ProfileButton />
        </View>
      </View>

      {showDoctorPicker && doctors && doctors.length > 0 ? (
        <DoctorPicker
          doctors={doctors}
          selectedDoctorId={selectedDoctorId}
          onSelect={setSelectedDoctorId}
        />
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today’s Summary</Text>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryRow}>
            <SummaryCard
              variant="confirmed"
              label="Confirmed"
              count={summary.confirmed}
              caption="Today"
            />
            <SummaryCard
              variant="cancelled"
              label="Cancelled"
              count={summary.cancelled}
              caption={summary.cancelled > 0 ? 'Needs attention' : 'Today'}
            />
          </View>
          <View style={styles.summaryRow}>
            <SummaryCard
              variant="unconfirmed"
              label="Unconfirmed"
              count={summary.unconfirmed}
              caption="Today"
            />
            <SummaryCard
              variant="total"
              label="Total Appointment"
              count={summary.total}
              caption="Today"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.appointmentsHeader}>
          <Text style={styles.sectionTitle}>Today’s Appointments</Text>
          <LinkText label="View All" onPress={() => router.push('/(tabs)/(home)/appointments')} />
        </View>

        {showLoading ? (
          <View style={styles.statusBlock}>
            <ActivityIndicator color={colors.primary[500]} />
          </View>
        ) : showError ? (
          <View style={styles.statusBlock}>
            <Text style={styles.errorText}>Couldn’t load appointments.</Text>
            <LinkText label="Try again" onPress={() => refetch()} disabled={isRefetching} />
          </View>
        ) : showEmpty ? (
          <View style={styles.statusBlock}>
            <Text style={styles.emptyText}>No appointments scheduled for today.</Text>
          </View>
        ) : showList ? (
          <View style={styles.appointmentsList}>
            {appointments.map((appt) => (
              <AppointmentCard
                key={appt.id}
                initials={appt.initials}
                name={appt.name}
                time={appt.time}
                treatment={appt.treatment}
                doctor={appt.doctor}
                status={appt.status}
                onPress={() => {}}
              />
            ))}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    gap: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    ...typography.title.large,
    fontFamily: 'Inter_700Bold',
    color: colors.neutral[500],
  },
  dateLabel: {
    ...typography.body.large,
    color: colors.text.secondary,
  },
  section: {
    gap: spacing.lg,
  },
  sectionTitle: {
    ...typography.title.medium,
    fontFamily: 'Inter_600SemiBold',
    color: colors.neutral[500],
  },
  summaryGrid: {
    gap: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  appointmentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appointmentsList: {
    gap: spacing.md,
  },
  statusBlock: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    ...typography.body.large,
    color: colors.danger[500],
  },
  emptyText: {
    ...typography.body.large,
    color: colors.text.secondary,
  },
});
