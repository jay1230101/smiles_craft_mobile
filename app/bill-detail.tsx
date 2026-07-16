import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { useBillDetail } from '@/hooks/use-bill-detail';
import { ms, s } from '@/lib/responsive';
import { useActiveBillStore } from '@/store/active-bill';
import { colors, spacing, typography } from '@/theme';
import type { BillEncounter } from '@/types/billing';

const HEADING_COLOR = '#1A202C';
const SUBTITLE_COLOR = '#64748B';
const ROW_LABEL_COLOR = '#64748B';

export default function BillDetailScreen() {
  const router = useRouter();
  const patientId = useActiveBillStore((s) => s.patientId);
  const patientName = useActiveBillStore((s) => s.patientName);
  const clear = useActiveBillStore((s) => s.clear);

  const { data, isLoading, isError, refetch, isRefetching } = useBillDetail(patientId);

  if (patientId === null) {
    return <Redirect href="/(tabs)/billing" />;
  }

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/billing');
    clear();
  };

  const openRecordPayment = () => {
    router.push('/record-payment' as never);
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
          <Text style={styles.title}>Bill Detail</Text>
          <Text style={styles.subtitle}>{patientName || 'Patient'}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary[500]} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Couldn’t load the bill.</Text>
          <Pressable onPress={() => refetch()} disabled={isRefetching}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : !data || data.encounters.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="checkmark-done-outline" size={ms(36)} color={colors.primary[500]} />
          </View>
          <Text style={styles.emptyHeading}>No outstanding balance</Text>
          <Text style={styles.emptyParagraph}>
            {data?.message || 'This patient has no pending charges.'}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.totalsCard}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Total Bill</Text>
              <Text style={styles.totalsValueMuted}>{formatMoney(data.totals.totalBill)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Previous Payments</Text>
              <Text style={styles.totalsValueMuted}>{formatMoney(data.totals.totalPreviousPayment)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabelEm}>Remaining Balance</Text>
              <Text style={styles.totalsValueEm}>{formatMoney(data.totals.totalRemainingBalance)}</Text>
            </View>
            {data.totals.latestBillNumber ? (
              <Text style={styles.billStamp}>
                Bill #{data.totals.latestBillNumber}
                {data.totals.latestBillDate ? ` · ${formatDateStamp(data.totals.latestBillDate)}` : ''}
              </Text>
            ) : null}
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Line Items</Text>
            <Text style={styles.sectionCount}>{data.encounters.length}</Text>
          </View>

          <View style={styles.list}>
            {data.encounters.map((enc) => (
              <EncounterCard key={enc.id} encounter={enc} />
            ))}
          </View>

          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Record payment"
              onPress={openRecordPayment}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}>
              <Ionicons name="cash-outline" size={ms(18)} color="#FFFFFF" />
              <Text style={styles.primaryLabel}>Record Payment</Text>
            </Pressable>
          </View>
        </>
      )}
    </Screen>
  );
}

function EncounterCard({ encounter }: { encounter: BillEncounter }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {encounter.procedure}
        </Text>
        <Text style={styles.cardTooth}>{encounter.toothNumber || '—'}</Text>
      </View>
      <View style={styles.cardMetaRow}>
        <Text style={styles.cardMeta}>{encounter.doctor}</Text>
        <Text style={styles.cardMeta}>{encounter.date ?? '—'}</Text>
      </View>
      <View style={styles.cardLine}>
        <Text style={styles.cardLabel}>Fees</Text>
        <Text style={styles.cardValue}>{formatMoney(encounter.fees)}</Text>
      </View>
      <View style={styles.cardLine}>
        <Text style={styles.cardLabel}>Discount</Text>
        <Text style={styles.cardValue}>{formatMoney(encounter.discount)}</Text>
      </View>
      <View style={styles.cardLine}>
        <Text style={styles.cardLabel}>Net</Text>
        <Text style={styles.cardValue}>{formatMoney(encounter.netPrice)}</Text>
      </View>
      <View style={styles.cardLine}>
        <Text style={styles.cardLabel}>Paid</Text>
        <Text style={styles.cardValue}>{formatMoney(encounter.previousPayment)}</Text>
      </View>
      <View style={styles.cardLineEm}>
        <Text style={styles.cardLabelEm}>Remaining</Text>
        <Text style={styles.cardValueEm}>{formatMoney(encounter.remainingBalance)}</Text>
      </View>
    </View>
  );
}

function formatMoney(n: number): string {
  return `$${(Math.round(n * 100) / 100).toFixed(2)}`;
}

function formatDateStamp(input: string): string {
  // /bill/<id> returns latestBillDate as ISO datetime; the per-encounter
  // dates come pre-formatted ("DD MONTH,YYYY"). Both are passed through
  // formatDateStamp here only for the ISO case — leave non-ISO strings
  // untouched so we don't double-format.
  if (!input.includes('T')) return input;
  try {
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return input;
    return d.toLocaleDateString();
  } catch {
    return input;
  }
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
    fontFamily: 'Inter_400Regular',
    fontSize: ms(14),
    lineHeight: ms(20),
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
  retryText: {
    ...typography.label.large,
    color: colors.primary[500],
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
    color: SUBTITLE_COLOR,
    textAlign: 'center',
    maxWidth: s(280),
  },
  totalsCard: {
    borderRadius: s(14),
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: '#F8FAFC',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalsLabel: {
    ...typography.body.medium,
    color: ROW_LABEL_COLOR,
  },
  totalsLabelEm: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
  },
  totalsValueMuted: {
    ...typography.body.medium,
    color: HEADING_COLOR,
  },
  totalsValueEm: {
    ...typography.title.medium,
    fontFamily: 'Inter_700Bold',
    color: colors.primary[500],
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing.xs,
  },
  billStamp: {
    ...typography.body.small,
    color: ROW_LABEL_COLOR,
    marginTop: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionHeading: {
    ...typography.title.medium,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
  },
  sectionCount: {
    ...typography.body.medium,
    color: ROW_LABEL_COLOR,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    borderRadius: s(12),
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.base,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  cardTitle: {
    flex: 1,
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
  },
  cardTooth: {
    ...typography.body.small,
    color: ROW_LABEL_COLOR,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  cardMeta: {
    ...typography.body.small,
    color: ROW_LABEL_COLOR,
  },
  cardLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    ...typography.body.medium,
    color: ROW_LABEL_COLOR,
  },
  cardValue: {
    ...typography.body.medium,
    color: HEADING_COLOR,
  },
  cardLineEm: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    marginTop: spacing.xs,
  },
  cardLabelEm: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
  },
  cardValueEm: {
    ...typography.label.large,
    fontFamily: 'Inter_700Bold',
    color: colors.primary[500],
  },
  actionRow: {
    marginTop: spacing.md,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: s(52),
    borderRadius: s(12),
    backgroundColor: colors.primary[500],
  },
  primaryLabel: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
});
