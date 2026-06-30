import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SearchInput } from '@/components/search-input';
import { usePendingBills } from '@/hooks/use-pending-bills';
import { ms, s } from '@/lib/responsive';
import { colors, spacing, typography } from '@/theme';
import type { PendingBillEntry } from '@/types/billing';

const HEADING_COLOR = '#1A202C';
const SUBTITLE_COLOR = '#64748B';

export default function AllUnpaidBillsScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = usePendingBills();
  const [query, setQuery] = useState('');

  const rows = data?.data ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.patient_name.toLowerCase().includes(q) ||
        r.provider.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const totalOutstanding = useMemo(
    () => filtered.reduce((sum, r) => sum + parseFloat(r.outstanding_balance || '0'), 0),
    [filtered],
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/billing');
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
          <Text style={styles.title}>All Unpaid Bills</Text>
          <Text style={styles.subtitle}>Every encounter with an outstanding balance</Text>
        </View>
      </View>

      <SearchInput
        placeholder="Search by patient or clinician"
        value={query}
        onChangeText={setQuery}
      />

      {isLoading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary[500]} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Couldn’t load the unpaid bills.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => refetch()}
            style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}>
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-done-circle-outline" size={ms(40)} color={colors.success[500]} />
          <Text style={styles.emptyTitle}>
            {rows.length === 0 ? 'No outstanding balances' : 'No matches'}
          </Text>
          <Text style={styles.emptyBody}>
            {rows.length === 0
              ? data?.message || 'Every bill in this clinic has been settled.'
              : 'No unpaid bills match this search.'}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.summary}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Bills</Text>
              <Text style={styles.summaryValue}>{filtered.length}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Outstanding</Text>
              <Text style={styles.summaryValueAccent}>{formatMoney(totalOutstanding)}</Text>
            </View>
          </View>

          {isRefetching ? (
            <View style={styles.refetchHint}>
              <ActivityIndicator size="small" color={colors.primary[500]} />
            </View>
          ) : null}

          <View style={styles.list}>
            {filtered.map((row, idx) => (
              <BillRow key={`${row.encounter_id}-${idx}`} row={row} />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

function BillRow({ row }: { row: PendingBillEntry }) {
  const statusTone = statusToneFor(row.medical_status);
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.rowName} numberOfLines={1}>
          {row.patient_name}
        </Text>
        <View style={styles.rowMetaRow}>
          <Ionicons name="person-outline" size={ms(12)} color={SUBTITLE_COLOR} />
          <Text style={styles.rowMeta} numberOfLines={1}>
            {row.provider || 'Unassigned'}
          </Text>
        </View>
        <View style={styles.rowMetaRow}>
          <Ionicons name="calendar-outline" size={ms(12)} color={SUBTITLE_COLOR} />
          <Text style={styles.rowMeta} numberOfLines={1}>
            {row.encounter_date || '—'}
          </Text>
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowAmount}>${formatAmount(row.outstanding_balance)}</Text>
        <View style={[styles.statusPill, { backgroundColor: statusTone.bg }]}>
          <Text style={[styles.statusText, { color: statusTone.fg }]}>
            {row.medical_status || 'pending'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function statusToneFor(status: string): { bg: string; fg: string } {
  const s = (status || '').toLowerCase();
  if (s.includes('progress')) return { bg: '#FEF3C7', fg: '#92400E' };
  if (s.includes('complete')) return { bg: '#DCFCE7', fg: '#166534' };
  return { bg: '#E2E8F0', fg: '#475569' };
}

function formatAmount(raw: string): string {
  const n = parseFloat(raw || '0');
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
}

function formatMoney(n: number): string {
  return `$${(Math.round(n * 100) / 100).toFixed(2)}`;
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    gap: spacing.lg,
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
    fontSize: ms(22),
    lineHeight: ms(28),
    color: HEADING_COLOR,
  },
  subtitle: {
    ...typography.body.medium,
    color: SUBTITLE_COLOR,
  },
  center: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  errorText: {
    ...typography.body.large,
    color: colors.danger[500],
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: s(999),
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  retryLabel: {
    ...typography.label.large,
    color: colors.primary[500],
  },
  emptyTitle: {
    ...typography.title.medium,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
    marginTop: spacing.sm,
  },
  emptyBody: {
    ...typography.body.medium,
    color: SUBTITLE_COLOR,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.primary[0],
    borderRadius: s(14),
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryCell: {
    flex: 1,
    gap: spacing.xs,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.primary[100],
  },
  summaryLabel: {
    ...typography.body.small,
    color: SUBTITLE_COLOR,
  },
  summaryValue: {
    ...typography.title.large,
    fontFamily: 'Inter_700Bold',
    fontSize: ms(22),
    color: HEADING_COLOR,
  },
  summaryValueAccent: {
    ...typography.title.large,
    fontFamily: 'Inter_700Bold',
    fontSize: ms(22),
    color: colors.primary[500],
  },
  refetchHint: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  list: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: s(12),
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.base,
  },
  rowMain: {
    flex: 1,
    gap: spacing.xs,
  },
  rowName: {
    ...typography.body.large,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
  },
  rowMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowMeta: {
    ...typography.body.small,
    color: SUBTITLE_COLOR,
    flex: 1,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  rowAmount: {
    ...typography.title.medium,
    fontFamily: 'Inter_700Bold',
    color: colors.primary[500],
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: s(999),
  },
  statusText: {
    ...typography.body.small,
    fontFamily: 'Inter_600SemiBold',
    fontSize: ms(10),
    textTransform: 'uppercase',
  },
});
