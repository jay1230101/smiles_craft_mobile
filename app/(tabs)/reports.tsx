import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { usePeriods } from '@/hooks/use-periods';
import { useReportData } from '@/hooks/use-report-data';
import { useReportsList } from '@/hooks/use-reports-list';
import { ms, s } from '@/lib/responsive';
import { colors, spacing, typography } from '@/theme';
import {
  formatPeriodLabel,
  kindFromReportName,
  type CancellationRow,
  type IncomeStatementRow,
  type Period,
  type ReportKind,
  type RevenueByClinicianRow,
} from '@/types/reports';

const HEADING_COLOR = '#1A202C';
const SUBTITLE_COLOR = '#64748B';

export default function ReportsScreen() {
  const bottomTabHeight = useBottomTabBarHeight();
  const safeBottomPadding = Math.max(bottomTabHeight, 80) + spacing.xxl;

  const { data: reportsList, isLoading: isListLoading } = useReportsList();
  const { data: allPeriods, isLoading: isPeriodsLoading } = usePeriods();
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [selectedPeriods, setSelectedPeriods] = useState<Period[]>([]);

  // First load → land on the first available report; later user-driven.
  const activeReportId = selectedReportId ?? reportsList?.[0]?.id ?? null;
  const activeReport = reportsList?.find((r) => r.id === activeReportId) ?? null;
  const activeKind: ReportKind | null = activeReport ? kindFromReportName(activeReport.name) : null;

  const { data: reportData, isLoading: isDataLoading, isError } = useReportData(
    activeReportId,
    selectedPeriods,
  );

  const togglePeriod = (p: Period) => {
    setSelectedPeriods((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  return (
    <Screen
      contentContainerStyle={[styles.container, { paddingBottom: safeBottomPadding }]}
      edges={['top']}>
      <View style={styles.headerText}>
        <Text style={styles.title}>Reports</Text>
        <Text style={styles.subtitle}>Clinic performance and financial reports</Text>
      </View>

      {isListLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary[500]} />
        </View>
      ) : !reportsList || reportsList.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No reports available for this clinic.</Text>
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsRow}>
            {reportsList.map((r) => {
              const active = r.id === activeReportId;
              return (
                <Pressable
                  key={r.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setSelectedReportId(r.id)}
                  style={({ pressed }) => [
                    styles.tab,
                    active && styles.tabActive,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{r.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.periodHeader}>
            <Text style={styles.sectionHeading}>Periods</Text>
            {selectedPeriods.length > 0 ? (
              <Pressable hitSlop={8} onPress={() => setSelectedPeriods([])}>
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            ) : null}
          </View>

          {isPeriodsLoading ? (
            <ActivityIndicator color={colors.primary[500]} />
          ) : !allPeriods || allPeriods.length === 0 ? (
            <Text style={styles.emptyText}>No periods available.</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.periodRow}>
              {allPeriods.map((p) => {
                const active = selectedPeriods.includes(p);
                return (
                  <Pressable
                    key={p}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => togglePeriod(p)}
                    style={({ pressed }) => [
                      styles.periodChip,
                      active && styles.periodChipActive,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={[styles.periodLabel, active && styles.periodLabelActive]}>
                      {formatPeriodLabel(p)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <Text style={styles.periodHint}>
            {selectedPeriods.length === 0
              ? 'All periods shown'
              : `${selectedPeriods.length} period${selectedPeriods.length === 1 ? '' : 's'} selected`}
          </Text>

          {isDataLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary[500]} />
            </View>
          ) : isError ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>Couldn’t load report data.</Text>
            </View>
          ) : !reportData || reportData.data.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>No data for the selected periods.</Text>
            </View>
          ) : (
            <ReportBody kind={activeKind} data={reportData} />
          )}
        </>
      )}
    </Screen>
  );
}

function ReportBody({
  kind,
  data,
}: {
  kind: ReportKind | null;
  data: NonNullable<ReturnType<typeof useReportData>['data']>;
}) {
  if (data.report === 'income_statement') {
    return <IncomeStatementView rows={data.data} />;
  }
  if (data.report === 'revenue_clinician') {
    return <RevenueByClinicianView rows={data.data} />;
  }
  if (data.report === 'cancellation') {
    return <CancellationView rows={data.data} />;
  }
  // Defensive: backend returned an unknown report kind. Surface a clear
  // message rather than rendering nothing — easier to triage in the field.
  return (
    <View style={styles.center}>
      <Text style={styles.emptyText}>Unsupported report type{kind ? `: ${kind}` : ''}.</Text>
    </View>
  );
}

function IncomeStatementView({ rows }: { rows: IncomeStatementRow[] }) {
  return (
    <View style={styles.cards}>
      {rows.map((row) => (
        <View key={row.period} style={styles.card}>
          <Text style={styles.cardPeriod}>{formatPeriodLabel(row.period)}</Text>
          <Row label="Net Profit" value={formatMoney(row.net_profit)} emphasis />
          <Row label="Net Revenue" value={formatMoney(row.net_revenue)} />
          <Row label="Gross Revenue" value={formatMoney(row.gross_revenue)} />
          <Row label="Total Discount" value={formatMoney(row.total_discount)} />
          <Row label="Total Expenses" value={formatMoney(row.total_expenses)} />
          <Row label="COGS" value={formatMoney(row.cogs)} />
          <Row label="Depreciation" value={formatMoney(row.depreciation)} />
        </View>
      ))}
    </View>
  );
}

function RevenueByClinicianView({ rows }: { rows: RevenueByClinicianRow[] }) {
  // Group by period so each card shows all providers within that month.
  const grouped = useMemo(() => groupBy(rows, (r) => r.period), [rows]);
  return (
    <View style={styles.cards}>
      {Object.entries(grouped).map(([period, providerRows]) => {
        const totalNet = providerRows.reduce((sum, r) => sum + r.net_revenue, 0);
        return (
          <View key={period} style={styles.card}>
            <View style={styles.cardHeadRow}>
              <Text style={styles.cardPeriod}>{formatPeriodLabel(period)}</Text>
              <Text style={styles.cardTotal}>{formatMoney(totalNet)}</Text>
            </View>
            {providerRows.map((r) => (
              <View key={`${period}-${r.provider_id}`} style={styles.providerRow}>
                <Text style={styles.providerName} numberOfLines={1}>
                  {r.provider_name}
                </Text>
                <View style={styles.providerAmountRow}>
                  <Text style={styles.providerShare}>{formatMoney(r.provider_share_amount)} doctor</Text>
                  <Text style={styles.providerClinic}>{formatMoney(r.clinic_share_amount)} clinic</Text>
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

function CancellationView({ rows }: { rows: CancellationRow[] }) {
  const grouped = useMemo(() => groupBy(rows, (r) => r.period), [rows]);
  return (
    <View style={styles.cards}>
      {Object.entries(grouped).map(([period, periodRows]) => {
        const total = periodRows.reduce((sum, r) => sum + r.Total_cancellations, 0);
        return (
          <View key={period} style={styles.card}>
            <View style={styles.cardHeadRow}>
              <Text style={styles.cardPeriod}>{formatPeriodLabel(period)}</Text>
              <Text style={styles.cardTotal}>{total} total</Text>
            </View>
            {periodRows.map((r, idx) => (
              <View key={`${period}-${r.doctor_id}-${r.reason_id}-${idx}`} style={styles.cancellationRow}>
                <View style={styles.cancellationText}>
                  <Text style={styles.cancellationReason}>{r.cancel_reason}</Text>
                  <Text style={styles.cancellationDoctor}>{r.doctor_name}</Text>
                </View>
                <View style={styles.cancellationCount}>
                  <Ionicons name="close-circle" size={ms(14)} color={colors.danger[500]} />
                  <Text style={styles.cancellationCountText}>{r.Total_cancellations}</Text>
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

function Row({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, emphasis && styles.rowLabelEm]}>{label}</Text>
      <Text style={[styles.rowValue, emphasis && styles.rowValueEm]}>{value}</Text>
    </View>
  );
}

function formatMoney(n: number): string {
  return `$${(Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function groupBy<T, K extends string | number>(items: T[], keyOf: (t: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of items) {
    const k = keyOf(item);
    if (!out[k]) out[k] = [];
    out[k].push(item);
  }
  return out;
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  headerText: {
    gap: spacing.xs,
  },
  title: {
    ...typography.title.large,
    fontFamily: 'Inter_700Bold',
    fontSize: ms(22),
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
  emptyText: {
    ...typography.body.medium,
    color: SUBTITLE_COLOR,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body.medium,
    color: colors.danger[500],
    textAlign: 'center',
  },
  tabsRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.base,
  },
  tabActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  tabLabel: {
    ...typography.label.large,
    fontSize: ms(13),
    color: HEADING_COLOR,
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.7,
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeading: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
  },
  clearText: {
    ...typography.label.large,
    color: colors.primary[500],
  },
  periodRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  periodChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary[500],
    backgroundColor: colors.background.base,
  },
  periodChipActive: {
    backgroundColor: colors.primary[500],
  },
  periodLabel: {
    ...typography.body.small,
    color: colors.primary[500],
  },
  periodLabelActive: {
    color: '#FFFFFF',
  },
  periodHint: {
    ...typography.body.small,
    color: SUBTITLE_COLOR,
  },
  cards: {
    gap: spacing.md,
  },
  card: {
    borderRadius: s(14),
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.base,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  cardPeriod: {
    ...typography.title.medium,
    fontFamily: 'Inter_700Bold',
    color: HEADING_COLOR,
  },
  cardTotal: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary[500],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    ...typography.body.medium,
    color: SUBTITLE_COLOR,
  },
  rowLabelEm: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
  },
  rowValue: {
    ...typography.body.medium,
    color: HEADING_COLOR,
  },
  rowValueEm: {
    ...typography.title.medium,
    fontFamily: 'Inter_700Bold',
    color: colors.primary[500],
  },
  providerRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    gap: spacing.xs,
  },
  providerName: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
  },
  providerAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  providerShare: {
    ...typography.body.small,
    color: SUBTITLE_COLOR,
  },
  providerClinic: {
    ...typography.body.small,
    color: SUBTITLE_COLOR,
  },
  cancellationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    gap: spacing.md,
  },
  cancellationText: {
    flex: 1,
    gap: 2,
  },
  cancellationReason: {
    ...typography.body.medium,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
  },
  cancellationDoctor: {
    ...typography.body.small,
    color: SUBTITLE_COLOR,
  },
  cancellationCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cancellationCountText: {
    ...typography.label.large,
    fontFamily: 'Inter_700Bold',
    color: colors.danger[500],
  },
});
