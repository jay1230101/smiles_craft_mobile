import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { formatDoctorName } from '@/lib/appointments';
import { usePeriods } from '@/hooks/use-periods';
import { useReportData } from '@/hooks/use-report-data';
import { useReportsList } from '@/hooks/use-reports-list';
import { ms, s } from '@/lib/responsive';
import { colors, spacing, typography } from '@/theme';
import {
  formatPeriodLabel,
  kindFromReportName,
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
  const queryClient = useQueryClient();

  // Reports data is also edited on the web (new treatments, expenses, whole new
  // months). The tab stays mounted while the user is elsewhere in the app, so
  // without this the cached numbers only refreshed on a full re-login. Refetch
  // the reports list, periods and data every time the tab regains focus.
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    }, [queryClient]),
  );

  const { data: rawReportsList, isLoading: isListLoading } = useReportsList();
  // Cancellations are handled entirely by the patient via WhatsApp now, so the
  // doctor-facing cancellation report was retired from the app. Hide it even
  // if the backend still lists the report.
  const reportsList = useMemo(
    () => (rawReportsList ?? []).filter((r) => kindFromReportName(r.name) !== 'cancellation'),
    [rawReportsList],
  );
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
            style={styles.chipStrip}
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
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                    {prettifyReportName(r.name)}
                  </Text>
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
              style={styles.chipStrip}
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
      {rows.map((row) => {
        // Client-requested summary — three figures only:
        //   1. Total Net Revenue
        //   2. Total Expenses = every expense category summed (cost of goods +
        //      depreciation + the operating expenses in total_expenses: rent,
        //      salaries, electricity, water …)
        //   3. Net Profit = revenue − total expenses
        // Net profit is derived here (rather than using row.net_profit) so the
        // three numbers reconcile and Total Expenses can include COGS — the
        // backend's net_profit formula leaves COGS out.
        const totalExpenses = row.cogs + row.depreciation + row.total_expenses;
        const netProfit = row.net_revenue - totalExpenses;
        return (
          <View key={row.period} style={styles.card}>
            <Text style={styles.cardPeriod}>{formatPeriodLabel(row.period)}</Text>
            <Row label="Total Net Revenue" value={formatMoney(row.net_revenue)} />
            <Row label="Total Expenses" value={formatMoney(totalExpenses)} />
            <Row label="Net Profit" value={formatMoney(netProfit)} emphasis />
          </View>
        );
      })}
    </View>
  );
}

function RevenueByClinicianView({ rows }: { rows: RevenueByClinicianRow[] }) {
  // Group by period so each card shows all providers within that month.
  // Backend returns `gross_revenue`, `clinic_share`, `provider_share` — no
  // separate `net_revenue` field on this report. Card total sums gross.
  const grouped = useMemo(() => groupBy(rows, (r) => r.period), [rows]);
  return (
    <View style={styles.cards}>
      {Object.entries(grouped).map(([period, providerRows]) => {
        const totalGross = providerRows.reduce((sum, r) => sum + r.gross_revenue, 0);
        return (
          <View key={period} style={styles.card}>
            <View style={styles.cardHeadRow}>
              <Text style={styles.cardPeriod}>{formatPeriodLabel(period)}</Text>
              <Text style={styles.cardTotal}>{formatMoney(totalGross)}</Text>
            </View>
            {providerRows.map((r) => (
              <View key={`${period}-${r.provider_id}`} style={styles.providerRow}>
                {/* Some User.name rows carry the "Dr" title and some don't, so
                    the report returns a mix ("Dr Mireille El rahi" next to
                    "Nelly Gemayel"). Route it through the shared helper so the
                    title is never missing — it's a no-op when one is present. */}
                <Text style={styles.providerName} numberOfLines={1}>
                  {formatDoctorName(r.provider_name) || '—'}
                </Text>
                <View style={styles.providerAmountRow}>
                  <Text style={styles.providerShare}>{formatMoney(r.provider_share)} doctor</Text>
                  <Text style={styles.providerClinic}>{formatMoney(r.clinic_share)} clinic</Text>
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
  // Defensive: even after the API-layer normalization, guard against a
  // stray NaN/Infinity slipping through (e.g. a future report shape we
  // haven't mapped yet) — showing $0.00 beats showing $NaN to the client.
  const safe = Number.isFinite(n) ? n : 0;
  return `$${(Math.round(safe * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Backend stores report names in the Reports table verbatim, currently as
// "Income_Statement", "Revenue_By_Clinician", "Cancellation_By_Reason".
// The web app displays them with spaces; do the same on mobile so the tab
// pills read naturally. Also lowercase joining words to feel like a title.
function prettifyReportName(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/\bBy\b/g, 'by')
    .trim();
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
  // Nested inside <Screen>'s vertical ScrollView the horizontal ScrollView
  // otherwise inherits flex-grow and stretches — that made the pill-shaped
  // Pressable children render as huge circles because borderRadius: 999
  // rounds to whichever side is smaller. flexGrow: 0 + alignItems: center
  // pin the strip at its content height so the pills stay pill-shaped.
  chipStrip: {
    flexGrow: 0,
    alignSelf: 'stretch',
  },
  tabsRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
    alignItems: 'center',
  },
  tab: {
    alignSelf: 'flex-start',
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
    alignItems: 'center',
  },
  periodChip: {
    alignSelf: 'flex-start',
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
});
