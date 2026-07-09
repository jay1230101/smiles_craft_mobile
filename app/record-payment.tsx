import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Checkbox } from '@/components/checkbox';
import { Screen } from '@/components/screen';
import { useBillDetail } from '@/hooks/use-bill-detail';
import { useRecordPayment } from '@/hooks/use-record-payment';
import { ms, s } from '@/lib/responsive';
import { useActiveBillStore } from '@/store/active-bill';
import { colors, spacing, typography } from '@/theme';
import type { BillEncounter } from '@/types/billing';

const HEADING_COLOR = '#1A202C';
const SUBTITLE_COLOR = '#64748B';

export default function RecordPaymentScreen() {
  const router = useRouter();
  const patientId = useActiveBillStore((s) => s.patientId);
  const patientName = useActiveBillStore((s) => s.patientName);
  const setReceipt = useActiveBillStore((s) => s.setReceipt);

  const { data, isLoading, isError } = useBillDetail(patientId);
  const recordPayment = useRecordPayment();

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [amountText, setAmountText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const encounters = data?.encounters ?? [];

  // Default: every encounter selected, amount = total remaining. This is the
  // common cashier flow ("patient is paying everything off"); the user can
  // then deselect rows or override the amount for partial payments.
  useEffect(() => {
    if (encounters.length > 0 && selectedIds.length === 0) {
      setSelectedIds(encounters.map((e) => e.id));
      const totalRemaining = encounters.reduce((s, e) => s + e.remainingBalance, 0);
      setAmountText(totalRemaining.toFixed(2));
    }
  }, [encounters, selectedIds.length]);

  const selectedRemaining = useMemo(
    () =>
      encounters
        .filter((e) => selectedIds.includes(e.id))
        .reduce((s, e) => s + e.remainingBalance, 0),
    [encounters, selectedIds],
  );

  const amountValue = useMemo(() => {
    const n = Number(amountText.replace(/,/g, ''));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [amountText]);

  const canSubmit =
    !recordPayment.isPending &&
    selectedIds.length > 0 &&
    amountValue > 0 &&
    amountValue <= selectedRemaining + 0.001;

  if (patientId === null) {
    return <Redirect href="/(tabs)/billing" />;
  }

  const toggleEncounter = (enc: BillEncounter) => {
    setSelectedIds((prev) =>
      prev.includes(enc.id) ? prev.filter((id) => id !== enc.id) : [...prev, enc.id],
    );
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/billing');
  };

  const submit = async () => {
    setErrorMessage(null);
    if (selectedIds.length === 0) {
      setErrorMessage('Select at least one bill line to pay.');
      return;
    }
    if (amountValue <= 0) {
      setErrorMessage('Enter a payment amount greater than zero.');
      return;
    }
    if (amountValue > selectedRemaining + 0.001) {
      setErrorMessage('Amount cannot exceed the selected remaining balance.');
      return;
    }
    if (!data?.patient) {
      setErrorMessage('Patient details are still loading. Please retry.');
      return;
    }
    const paidEncounters = encounters.filter((e) => selectedIds.includes(e.id));
    // All encounters in a single bill share the same doctor on the web; fall
    // back to the first selected encounter's provider if mixed.
    const doctorName = paidEncounters[0]?.doctor ?? '';

    try {
      const res = await recordPayment.mutateAsync({
        patient_id: patientId,
        billID: selectedIds,
        amountPaid: amountValue,
        doctorName,
        patient: data.patient,
        paidEncounters,
      });
      if (res.status === 'success' && res.receipt) {
        setReceipt(res.receipt);
        router.replace('/receipt' as never);
        return;
      }
      setErrorMessage(res.message || 'Payment could not be recorded.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Payment could not be recorded.');
    }
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
          <Text style={styles.title}>Record Payment</Text>
          <Text style={styles.subtitle}>{patientName || 'Patient'}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary[500]} />
        </View>
      ) : isError || encounters.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Couldn’t load this patient’s outstanding bills.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionHeading}>Bill Items</Text>
          <View style={styles.list}>
            {encounters.map((enc) => (
              <View key={enc.id} style={styles.encounterRow}>
                <Checkbox
                  value={selectedIds.includes(enc.id)}
                  onChange={() => toggleEncounter(enc)}
                />
                <View style={styles.encounterText}>
                  <Text style={styles.encounterTitle} numberOfLines={2}>
                    {enc.procedure}
                  </Text>
                  <Text style={styles.encounterMeta}>
                    {enc.toothNumber ? `${enc.toothNumber} · ` : ''}
                    {enc.doctor}
                  </Text>
                </View>
                <Text style={styles.encounterAmount}>{formatMoney(enc.remainingBalance)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          {/* "(insert amount collected)" cues the cashier that this field is
              editable — the default is the full outstanding total, but they can
              type the amount actually collected for a partial payment. */}
          <Text style={styles.sectionHeading}>Amount (insert amount collected)</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountSymbol}>$</Text>
            <TextInput
              value={amountText}
              onChangeText={setAmountText}
              placeholder="0.00"
              placeholderTextColor={SUBTITLE_COLOR}
              keyboardType="decimal-pad"
              style={styles.amountInput}
            />
          </View>
          <Text style={styles.amountHelper}>
            Selected total: {formatMoney(selectedRemaining)}
          </Text>

          {errorMessage ? <Text style={styles.errorInline}>{errorMessage}</Text> : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Submit payment"
            disabled={!canSubmit}
            onPress={submit}
            style={({ pressed }) => [
              styles.primaryBtn,
              !canSubmit && styles.primaryBtnDisabled,
              pressed && canSubmit && styles.pressed,
            ]}>
            {recordPayment.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-outline" size={ms(18)} color="#FFFFFF" />
                <Text style={styles.primaryLabel}>Record Payment</Text>
              </>
            )}
          </Pressable>
        </>
      )}
    </Screen>
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
  sectionHeading: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
    marginTop: spacing.sm,
  },
  list: {
    gap: spacing.md,
  },
  encounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: s(10),
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.base,
  },
  encounterText: {
    flex: 1,
    gap: 2,
  },
  encounterTitle: {
    ...typography.body.medium,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
  },
  encounterMeta: {
    ...typography.body.small,
    color: SUBTITLE_COLOR,
  },
  encounterAmount: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary[500],
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing.xs,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    height: s(56),
    borderRadius: s(12),
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: '#F8FAFC',
  },
  amountSymbol: {
    ...typography.title.medium,
    fontFamily: 'Inter_700Bold',
    color: HEADING_COLOR,
  },
  amountInput: {
    flex: 1,
    ...typography.title.medium,
    fontFamily: 'Inter_700Bold',
    color: HEADING_COLOR,
  },
  amountHelper: {
    ...typography.body.small,
    color: SUBTITLE_COLOR,
  },
  errorInline: {
    ...typography.body.medium,
    color: colors.danger[500],
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: s(52),
    borderRadius: s(12),
    backgroundColor: colors.primary[500],
    marginTop: spacing.sm,
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryLabel: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
});
