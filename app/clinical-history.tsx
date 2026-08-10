import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { usePlanOfCareHistory } from '@/hooks/use-plan-of-care';
import { useVisitsHistory } from '@/hooks/use-visits-history';
import { formatDoctorName } from '@/lib/appointments';
import { ms, s } from '@/lib/responsive';
import { useActiveAppointmentStore } from '@/store/active-appointment';
import { colors, radius, spacing, typography } from '@/theme';
import type { PlanOfCareItem, VisitsHistoryItem } from '@/types/orders';

const HEADING_COLOR = '#1A202C';
const SUBTITLE_COLOR = '#64748B';

type Tab = 'visits' | 'plan';

export default function ClinicalHistoryScreen() {
  const router = useRouter();
  const event = useActiveAppointmentStore((s) => s.event);
  const clearEvent = useActiveAppointmentStore((s) => s.clear);

  const [tab, setTab] = useState<Tab>('visits');

  if (!event) {
    return <Redirect href="/(tabs)/calendar" />;
  }

  const fullName = `${(event.name ?? '').trim()} ${(event.family ?? '').trim()}`.trim();
  const medicalHistory = (event.extendedProps?.medical_history ?? '').trim();

  const goBack = () => {
    clearEvent();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/calendar');
  };

  return (
    <Screen contentContainerStyle={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={goBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={s(20)} color={HEADING_COLOR} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Clinical History</Text>
          <Text style={styles.subtitle}>{fullName || 'Patient'}</Text>
          {medicalHistory ? (
            <Text style={styles.medicalHistory} numberOfLines={2}>
              {medicalHistory}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.tabsRow}>
        <TabPill label="Visits" active={tab === 'visits'} onPress={() => setTab('visits')} />
        <TabPill label="Plan of Care" active={tab === 'plan'} onPress={() => setTab('plan')} />
      </View>

      {tab === 'visits' ? (
        <VisitsTab patientId={event.patientId} />
      ) : (
        <PlanTab patientId={event.patientId} />
      )}
    </Screen>
  );
}

function VisitsTab({ patientId }: { patientId: number }) {
  const { data, isLoading, isError, error } = useVisitsHistory(patientId);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary[500]} />
      </View>
    );
  }
  if (isError) {
    return (
      <Text style={styles.errorText}>{error instanceof Error ? error.message : 'Could not load visits.'}</Text>
    );
  }
  if (!data || data.length === 0) {
    return <Text style={styles.emptyText}>No past visits for this patient.</Text>;
  }
  return (
    <View style={styles.list}>
      {data.map((v) => (
        <VisitCard key={v.id} visit={v} />
      ))}
    </View>
  );
}

function VisitCard({ visit }: { visit: VisitsHistoryItem }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {visit.procedure}
        </Text>
        <Text style={styles.cardDate}>{visit.visitDate}</Text>
      </View>
      <Text style={styles.cardMeta}>
        {visit.toothNumber || 'No tooth'} · {formatDoctorName(visit.doctorName) || '—'}
      </Text>
      <View style={styles.cardRow}>
        <Stat label="Fees" value={String(visit.fees)} />
        <Stat label="Discount" value={String(visit.discount)} />
        <Stat label="Paid" value={String(visit.amountPaid)} />
        <Stat label="Balance" value={String(visit.remainingBalance)} />
      </View>
      {visit.visit_notes ? (
        <Text style={styles.cardNotes} numberOfLines={3}>
          {visit.visit_notes}
        </Text>
      ) : null}
    </View>
  );
}

function PlanTab({ patientId }: { patientId: number }) {
  const { data, isLoading, isError, error } = usePlanOfCareHistory(patientId);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary[500]} />
      </View>
    );
  }
  if (isError) {
    return (
      <Text style={styles.errorText}>{error instanceof Error ? error.message : 'Could not load plans.'}</Text>
    );
  }
  if (!data || data.length === 0) {
    return <Text style={styles.emptyText}>No plans of care for this patient.</Text>;
  }
  return (
    <View style={styles.list}>
      {data.map((p) => (
        <PlanCard key={p.id} plan={p} />
      ))}
    </View>
  );
}

function PlanCard({ plan }: { plan: PlanOfCareItem }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>Plan of Care</Text>
        <Text style={styles.cardDate}>{plan.visitDate}</Text>
      </View>
      <Text style={styles.cardMeta}>{formatDoctorName(plan.doctorName) || '—'}</Text>
      <Text style={styles.cardBody}>{plan.planOfCare}</Text>
    </View>
  );
}

function TabPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        active && styles.tabActive,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  backBtn: {
    width: s(40),
    height: s(40),
    borderRadius: s(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.base,
  },
  pressed: {
    opacity: 0.6,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.title.large,
    fontFamily: 'Inter_700Bold',
    color: HEADING_COLOR,
    fontSize: ms(22),
    lineHeight: ms(28),
  },
  subtitle: {
    ...typography.body.large,
    fontFamily: 'Inter_400Regular',
    color: SUBTITLE_COLOR,
    fontSize: ms(14),
    lineHeight: ms(20),
  },
  medicalHistory: {
    ...typography.body.medium,
    fontFamily: 'Inter_600SemiBold',
    color: colors.danger[500],
    fontSize: ms(13),
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.background.surface,
    padding: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: 'stretch',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: s(10),
    borderRadius: radius.pill,
  },
  tabActive: {
    backgroundColor: colors.background.base,
  },
  tabLabel: {
    ...typography.label.large,
    color: colors.text.secondary,
  },
  tabLabelActive: {
    color: colors.primary[500],
    fontFamily: 'Inter_600SemiBold',
  },
  center: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body.medium,
    color: colors.text.secondary,
    paddingVertical: spacing.xxl,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body.medium,
    color: colors.danger[500],
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardTitle: {
    ...typography.body.large,
    fontFamily: 'Inter_600SemiBold',
    color: colors.neutral[500],
    flex: 1,
  },
  cardDate: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  cardMeta: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  cardRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  cardNotes: {
    ...typography.body.medium,
    color: colors.neutral[500],
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  cardBody: {
    ...typography.body.medium,
    color: colors.neutral[500],
  },
  stat: {
    minWidth: s(60),
    gap: 2,
  },
  statLabel: {
    ...typography.body.small,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statValue: {
    ...typography.body.large,
    fontFamily: 'Inter_600SemiBold',
    color: colors.neutral[500],
  },
});
