import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppointmentCard } from '@/components/appointment-card';
import { BackButton } from '@/components/back-button';
import { LinkText } from '@/components/link-text';
import { Screen } from '@/components/screen';
import { SearchInput } from '@/components/search-input';
import { useAllEvents } from '@/hooks/use-appointments';
import {
  eventToAppointmentItem,
  eventsForDate,
  sortAppointmentsByTime,
  todayYMD,
} from '@/lib/appointments';
import { DEMO_MODE, MOCK_APPOINTMENTS } from '@/lib/mock-appointments';
import { colors, radius, spacing, typography } from '@/theme';

export default function AppointmentsScreen() {
  const [query, setQuery] = useState('');
  const bottomTabHeight = useBottomTabBarHeight();
  const safeBottomPadding = Math.max(bottomTabHeight, 80) + spacing.xxl;
  const { data: events, isLoading, isError, refetch, isRefetching } = useAllEvents();

  const today = useMemo(() => todayYMD(), []);

  const allTodays = useMemo(() => {
    if (DEMO_MODE) return MOCK_APPOINTMENTS;
    const items = eventsForDate(events ?? [], today).map(eventToAppointmentItem);
    return sortAppointmentsByTime(items);
  }, [events, today]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allTodays;
    return allTodays.filter(
      (a) => a.name.toLowerCase().includes(q) || a.treatment.toLowerCase().includes(q),
    );
  }, [allTodays, query]);

  const totalLabel = String(allTodays.length).padStart(2, '0');
  const showLoading = !DEMO_MODE && isLoading && !events;
  const showError = !DEMO_MODE && isError;
  const showEmpty = !showLoading && !showError && filtered.length === 0;

  return (
    <Screen
      contentContainerStyle={[styles.container, { paddingBottom: safeBottomPadding }]}
      edges={['top']}>
      <View style={styles.headerRow}>
        <BackButton />
        <View style={styles.titleBlock}>
          <Text style={styles.title}>All Appointment’s</Text>
          <Text style={styles.subtitle}>{`${totalLabel} Total Patients`}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New appointment"
          onPress={() => {}}
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}>
          <Ionicons name="add" size={26} color={colors.text.inverse} />
        </Pressable>
      </View>

      <SearchInput value={query} onChangeText={setQuery} placeholder="Search..." />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today’s Appointments</Text>

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
            <Text style={styles.emptyText}>
              {query.trim() ? 'No matching appointments.' : 'No appointments scheduled for today.'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((appt) => (
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
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.title.large,
    fontFamily: 'Inter_700Bold',
    color: colors.neutral[500],
  },
  subtitle: {
    ...typography.body.large,
    color: colors.text.secondary,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonPressed: {
    opacity: 0.85,
  },
  section: {
    gap: spacing.lg,
  },
  sectionTitle: {
    ...typography.title.medium,
    fontFamily: 'Inter_600SemiBold',
    color: colors.neutral[500],
  },
  list: {
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
