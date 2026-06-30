import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SearchInput } from '@/components/search-input';
import { usePatientBilling } from '@/hooks/use-patient-billing';
import { useSearchPatients } from '@/hooks/use-search-patients';
import { ms, s } from '@/lib/responsive';
import { useActiveBillStore } from '@/store/active-bill';
import { colors, spacing, typography } from '@/theme';
import type { PatientBillingProcedure } from '@/types/billing';
import type { PatientListItem } from '@/types/patients';

const HEADING_COLOR = '#1A202C';
const SUBTITLE_COLOR = '#64748B';

export default function OutstandingByPatientScreen() {
  const router = useRouter();
  const setActiveBillPatient = useActiveBillStore((s) => s.setPatient);

  const [term, setTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientListItem | null>(null);

  // Debounce the search input so we don't fire a request per keystroke. The
  // hook only enables once the trimmed term has ≥ 2 chars.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedTerm(term), 350);
    return () => clearTimeout(id);
  }, [term]);

  const {
    data: searchResults,
    isFetching: isSearching,
  } = useSearchPatients(selectedPatient ? '' : debouncedTerm);

  const {
    data: billing,
    isLoading: isBillingLoading,
    isError: isBillingError,
  } = usePatientBilling(selectedPatient?.id ?? null);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/billing');
  };

  const pickPatient = (p: PatientListItem) => {
    setSelectedPatient(p);
    setTerm('');
    setDebouncedTerm('');
  };

  const clearPatient = () => {
    setSelectedPatient(null);
  };

  const openCashierFlow = () => {
    if (!selectedPatient) return;
    const fullName = `${selectedPatient.name} ${selectedPatient.family ?? ''}`.trim();
    setActiveBillPatient(selectedPatient.id, fullName);
    router.push('/bill-detail' as never);
  };

  const procedures = billing?.procedures ?? [];
  const outstanding = procedures.filter((p) => p.remaining_balance > 0);
  const totalOutstanding = useMemo(
    () => outstanding.reduce((sum, p) => sum + p.remaining_balance, 0),
    [outstanding],
  );

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
          <Text style={styles.title}>Outstanding by Patient</Text>
          <Text style={styles.subtitle}>
            {selectedPatient
              ? `${selectedPatient.name} ${selectedPatient.family ?? ''}`.trim()
              : 'Search a patient to see their billing history'}
          </Text>
        </View>
      </View>

      {selectedPatient ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search a different patient"
          onPress={clearPatient}
          style={({ pressed }) => [styles.switchPatientBtn, pressed && styles.pressed]}>
          <Ionicons name="swap-horizontal-outline" size={ms(16)} color={colors.primary[500]} />
          <Text style={styles.switchPatientLabel}>Search a different patient</Text>
        </Pressable>
      ) : (
        <>
          <SearchInput
            placeholder="Search by name or phone…"
            value={term}
            onChangeText={setTerm}
          />
          <SearchResults
            term={debouncedTerm}
            isSearching={isSearching}
            results={searchResults ?? []}
            onPick={pickPatient}
          />
        </>
      )}

      {selectedPatient ? (
        <PatientBillingBody
          isLoading={isBillingLoading}
          isError={isBillingError}
          procedures={procedures}
          outstanding={outstanding}
          totalOutstanding={totalOutstanding}
          onCollect={openCashierFlow}
        />
      ) : null}
    </Screen>
  );
}

function SearchResults({
  term,
  isSearching,
  results,
  onPick,
}: {
  term: string;
  isSearching: boolean;
  results: PatientListItem[];
  onPick: (p: PatientListItem) => void;
}) {
  const trimmed = term.trim();
  if (trimmed.length < 2) {
    return (
      <View style={styles.hintBlock}>
        <Ionicons name="search-outline" size={ms(20)} color={SUBTITLE_COLOR} />
        <Text style={styles.hintText}>
          Type at least 2 characters to search the patient registry.
        </Text>
      </View>
    );
  }
  if (isSearching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary[500]} />
      </View>
    );
  }
  if (results.length === 0) {
    return (
      <View style={styles.hintBlock}>
        <Ionicons name="alert-circle-outline" size={ms(20)} color={SUBTITLE_COLOR} />
        <Text style={styles.hintText}>No patients match “{trimmed}”.</Text>
      </View>
    );
  }
  return (
    <View style={styles.resultsList}>
      {results.map((p) => (
        <Pressable
          key={p.id}
          accessibilityRole="button"
          accessibilityLabel={`Pick ${p.name} ${p.family ?? ''}`}
          onPress={() => onPick(p)}
          style={({ pressed }) => [styles.resultRow, pressed && styles.pressed]}>
          <View style={styles.resultAvatar}>
            <Text style={styles.resultAvatarText}>
              {`${p.name?.[0] ?? ''}${p.family?.[0] ?? ''}`.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.resultText}>
            <Text style={styles.resultName} numberOfLines={1}>
              {`${p.name} ${p.family ?? ''}`.trim()}
            </Text>
            {p.phone ? (
              <Text style={styles.resultMeta} numberOfLines={1}>
                {p.phone}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={ms(18)} color={SUBTITLE_COLOR} />
        </Pressable>
      ))}
    </View>
  );
}

function PatientBillingBody({
  isLoading,
  isError,
  procedures,
  outstanding,
  totalOutstanding,
  onCollect,
}: {
  isLoading: boolean;
  isError: boolean;
  procedures: PatientBillingProcedure[];
  outstanding: PatientBillingProcedure[];
  totalOutstanding: number;
  onCollect: () => void;
}) {
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary[500]} />
      </View>
    );
  }
  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Couldn’t load billing for this patient.</Text>
      </View>
    );
  }
  if (procedures.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="receipt-outline" size={ms(36)} color={SUBTITLE_COLOR} />
        <Text style={styles.emptyTitle}>No billing history</Text>
        <Text style={styles.emptyBody}>
          This patient has no billed procedures yet.
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.summary}>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>Bills with balance</Text>
          <Text style={styles.summaryValue}>{outstanding.length}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>Total outstanding</Text>
          <Text style={styles.summaryValueAccent}>{formatMoney(totalOutstanding)}</Text>
        </View>
      </View>

      {outstanding.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Collect payment for this patient"
          onPress={onCollect}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}>
          <Ionicons name="cash-outline" size={ms(18)} color="#FFFFFF" />
          <Text style={styles.primaryLabel}>Collect Payment</Text>
        </Pressable>
      ) : null}

      <Text style={styles.sectionHeading}>Billing History</Text>
      <View style={styles.historyList}>
        {procedures.map((p) => (
          <ProcedureRow key={p.id} proc={p} />
        ))}
      </View>
    </>
  );
}

function ProcedureRow({ proc }: { proc: PatientBillingProcedure }) {
  const settled = proc.remaining_balance <= 0;
  return (
    <View style={styles.historyRow}>
      <View style={styles.historyMain}>
        <Text style={styles.historyProcedure} numberOfLines={1}>
          {proc.procedure}
        </Text>
        <Text style={styles.historyMeta} numberOfLines={1}>
          {proc.status_date} · {proc.provider || 'Unassigned'}
        </Text>
        <View style={styles.historyFigures}>
          <Text style={styles.historyFigure}>
            Net <Text style={styles.historyFigureValue}>{formatMoney(proc.net_price)}</Text>
          </Text>
          <Text style={styles.historyFigure}>
            Paid <Text style={styles.historyFigureValue}>{formatMoney(proc.amount_paid)}</Text>
          </Text>
        </View>
      </View>
      <View style={styles.historyRight}>
        <Text style={settled ? styles.historyBalanceSettled : styles.historyBalanceDue}>
          {formatMoney(proc.remaining_balance)}
        </Text>
        <View
          style={[styles.statusPill, { backgroundColor: settled ? '#DCFCE7' : '#FEE2E2' }]}>
          <Text
            style={[styles.statusText, { color: settled ? '#166534' : '#991B1B' }]}
            numberOfLines={1}>
            {settled ? 'paid' : 'due'}
          </Text>
        </View>
      </View>
    </View>
  );
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
  switchPatientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: s(999),
    borderWidth: 1,
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[0],
  },
  switchPatientLabel: {
    ...typography.label.large,
    color: colors.primary[500],
  },
  hintBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: s(10),
    backgroundColor: colors.background.surface,
  },
  hintText: {
    flex: 1,
    ...typography.body.small,
    color: SUBTITLE_COLOR,
  },
  resultsList: {
    gap: spacing.sm,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: s(12),
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.base,
  },
  resultAvatar: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    backgroundColor: colors.primary[0],
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultAvatarText: {
    ...typography.label.large,
    fontFamily: 'Inter_700Bold',
    color: colors.primary[500],
  },
  resultText: {
    flex: 1,
    gap: 2,
  },
  resultName: {
    ...typography.body.large,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
  },
  resultMeta: {
    ...typography.body.small,
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
  emptyTitle: {
    ...typography.title.medium,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
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
  sectionHeading: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
    marginTop: spacing.sm,
  },
  historyList: {
    gap: spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: s(12),
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.base,
  },
  historyMain: {
    flex: 1,
    gap: spacing.xs,
  },
  historyProcedure: {
    ...typography.body.large,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
  },
  historyMeta: {
    ...typography.body.small,
    color: SUBTITLE_COLOR,
  },
  historyFigures: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  historyFigure: {
    ...typography.body.small,
    color: SUBTITLE_COLOR,
  },
  historyFigureValue: {
    ...typography.body.small,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  historyBalanceDue: {
    ...typography.title.medium,
    fontFamily: 'Inter_700Bold',
    color: colors.danger[500],
  },
  historyBalanceSettled: {
    ...typography.title.medium,
    fontFamily: 'Inter_700Bold',
    color: colors.success[500],
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
