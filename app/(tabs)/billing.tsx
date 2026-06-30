import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SearchInput } from '@/components/search-input';
import { useCurrentBills } from '@/hooks/use-current-bills';
import { ms, s } from '@/lib/responsive';
import { useActiveBillStore } from '@/store/active-bill';
import { colors, spacing, typography } from '@/theme';
import { fullPatientName, patientInitials, type CurrentBillEntry } from '@/types/billing';

const HEADING_COLOR = '#1A202C';
const PARAGRAPH_COLOR = '#64748B';

export default function BillingScreen() {
  const router = useRouter();
  const bottomTabHeight = useBottomTabBarHeight();
  const safeBottomPadding = Math.max(bottomTabHeight, 80) + spacing.xxl;
  const { data, isLoading, isError, refetch, isRefetching } = useCurrentBills();
  const setPatient = useActiveBillStore((s) => s.setPatient);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const list = data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => fullPatientName(p).toLowerCase().includes(q));
  }, [data, query]);

  const openBill = (patient: CurrentBillEntry) => {
    setPatient(patient.patientId, fullPatientName(patient));
    router.push('/bill-detail' as never);
  };

  if (isLoading) {
    return (
      <Screen
        contentContainerStyle={[styles.statusContainer, { paddingBottom: safeBottomPadding }]}
        edges={['top']}>
        <ActivityIndicator color={colors.primary[500]} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen
        contentContainerStyle={[styles.statusContainer, { paddingBottom: safeBottomPadding }]}
        edges={['top']}>
        <Text style={styles.errorText}>Couldn’t load the cashier queue.</Text>
        <Pressable onPress={() => refetch()} disabled={isRefetching}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </Screen>
    );
  }

  const total = data?.length ?? 0;

  return (
    <Screen
      contentContainerStyle={[styles.listContainer, { paddingBottom: safeBottomPadding }]}
      edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Billing</Text>
          <Text style={styles.subtitle}>{formatTotal(total)} patients with pending charges today</Text>
        </View>
      </View>

      <SearchInput
        placeholder="Search patient…"
        value={query}
        onChangeText={setQuery}
      />

      <View style={styles.quickActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Outstanding by patient name"
          onPress={() => router.push('/outstanding-by-patient' as never)}
          style={({ pressed }) => [styles.quickAction, pressed && styles.rowPressed]}>
          <Ionicons name="person-circle-outline" size={ms(20)} color={colors.primary[500]} />
          <Text style={styles.quickActionLabel} numberOfLines={1}>
            Outstanding by patient
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="All unpaid bills"
          onPress={() => router.push('/all-unpaid-bills' as never)}
          style={({ pressed }) => [styles.quickAction, pressed && styles.rowPressed]}>
          <Ionicons name="receipt-outline" size={ms(20)} color={colors.primary[500]} />
          <Text style={styles.quickActionLabel} numberOfLines={1}>
            All unpaid bills
          </Text>
        </Pressable>
      </View>

      {total === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="checkmark-done-outline" size={ms(36)} color={colors.primary[500]} />
          </View>
          <Text style={styles.emptyHeading}>All caught up</Text>
          <Text style={styles.emptyParagraph}>
            No patients have outstanding charges today.
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <Text style={styles.noResults}>No patients match “{query}”.</Text>
      ) : (
        <View style={styles.list}>
          {filtered.map((p) => (
            <CashierRow key={p.patientId} entry={p} onPress={() => openBill(p)} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function CashierRow({ entry, onPress }: { entry: CurrentBillEntry; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open bill for ${fullPatientName(entry)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{patientInitials(entry)}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {fullPatientName(entry)}
        </Text>
        <Text style={styles.rowMeta}>Tap to view bill</Text>
      </View>
      <Ionicons name="chevron-forward" size={ms(20)} color={PARAGRAPH_COLOR} />
    </Pressable>
  );
}

function formatTotal(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

const styles = StyleSheet.create({
  statusContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  errorText: {
    ...typography.body.large,
    color: colors.danger[500],
    textAlign: 'center',
  },
  retryText: {
    ...typography.label.large,
    color: colors.primary[500],
  },
  listContainer: {
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.title.large,
    fontFamily: 'Inter_700Bold',
    fontSize: ms(22),
    lineHeight: ms(28),
    color: HEADING_COLOR,
  },
  subtitle: {
    ...typography.body.medium,
    fontFamily: 'Inter_400Regular',
    fontSize: ms(14),
    lineHeight: ms(20),
    color: PARAGRAPH_COLOR,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: s(12),
    borderWidth: 1,
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[0],
  },
  quickActionLabel: {
    flex: 1,
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    fontSize: ms(13),
    color: colors.primary[500],
  },
  list: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: s(12),
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.base,
  },
  rowPressed: {
    opacity: 0.7,
  },
  avatar: {
    width: s(44),
    height: s(44),
    borderRadius: s(22),
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary[500],
  },
  rowText: {
    flex: 1,
    gap: spacing.xs,
  },
  rowName: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    fontSize: ms(15),
    color: HEADING_COLOR,
  },
  rowMeta: {
    ...typography.body.small,
    color: PARAGRAPH_COLOR,
  },
  noResults: {
    ...typography.body.medium,
    color: PARAGRAPH_COLOR,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  emptyIconCircle: {
    width: s(72),
    height: s(72),
    borderRadius: s(36),
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHeading: {
    ...typography.title.medium,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
  },
  emptyParagraph: {
    ...typography.body.medium,
    color: PARAGRAPH_COLOR,
    textAlign: 'center',
    maxWidth: s(280),
  },
});
