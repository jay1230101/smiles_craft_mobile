import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Screen } from '@/components/screen';
import { Select, type SelectOption } from '@/components/select';
import { TextInput } from '@/components/text-input';
import { usePendingProcedures } from '@/hooks/use-pending-procedures';
import { useProcedureInit } from '@/hooks/use-procedure-init';
import { useSubmitTreatmentPlan } from '@/hooks/use-submit-treatment-plan';
import { formatDoctorName } from '@/lib/appointments';
import { ms, s } from '@/lib/responsive';
import { useActiveAppointmentStore } from '@/store/active-appointment';
import { useAuthStore } from '@/store/auth';
import { colors, radius, spacing, typography } from '@/theme';
import type {
  PendingProcedure,
  StagedProcedure,
  StatusUpdateRequest,
  TreatmentPlanProcedure,
  TreatmentPlanRequest,
} from '@/types/orders';

const HEADING_COLOR = '#1A202C';
const SUBTITLE_COLOR = '#64748B';

// Non-dental specialties (show_tooth === false) have no status picker; their
// procedures are recorded as completed. Matches the backend's own fallback
// (`status = item.get("status") or "Completed"` in /treatment-plan).
const DEFAULT_NON_DENTAL_STATUS = 'Completed';

export default function OrdersScreen() {
  const router = useRouter();
  const event = useActiveAppointmentStore((s) => s.event);
  const clearEvent = useActiveAppointmentStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);

  const { data: init, isLoading: initLoading } = useProcedureInit();
  const { data: pending, isLoading: pendingLoading } = usePendingProcedures(
    event?.patientId ?? null,
    event?.resourceId ?? null,
  );
  const submitMutation = useSubmitTreatmentPlan();

  const [procedureId, setProcedureId] = useState<string | null>(null);
  const [price, setPrice] = useState<string>('');
  const [toothCode, setToothCode] = useState<number | null>(null);
  const [discount, setDiscount] = useState<string>('0');
  const [status, setStatus] = useState<string | null>(null);
  const [visitNotes, setVisitNotes] = useState<string>('');
  const [staged, setStaged] = useState<StagedProcedure[]>([]);
  const [statusUpdates, setStatusUpdates] = useState<Record<number, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  // Auto-fill price when procedure is selected. Mirrors the web behaviour.
  useEffect(() => {
    if (!procedureId || !init) return;
    const found = init.procedures.find((p) => p.procedure_id === procedureId);
    if (found) setPrice(String(found.price));
  }, [procedureId, init]);

  const procedureOptions: SelectOption<string>[] = useMemo(
    () =>
      (init?.procedures ?? []).map((p) => ({
        value: p.procedure_id,
        label: `${p.description} — ${p.price} ${p.currency}`,
      })),
    [init?.procedures],
  );

  const toothOptions: SelectOption<number>[] = useMemo(
    () =>
      (init?.toothlist ?? []).map((t) => ({
        value: t.code,
        label: t.description,
      })),
    [init?.toothlist],
  );

  const statusOptions: SelectOption<string>[] = useMemo(
    () =>
      (init?.status_list ?? []).map((s) => ({
        value: s.procedureStatus,
        label: s.procedureStatus.replace(/_/g, ' '),
      })),
    [init?.status_list],
  );

  if (!event) {
    return <Redirect href="/(tabs)/calendar" />;
  }

  // Whether to show the dental tooth/status fields is driven by the appointment
  // DOCTOR's specialty, not the procedure init. The backend already stamps
  // `show_tooth_number` on every event (get_encounters in views.py) from the
  // doctor's specialty config, and the web's OrdersModal reads that exact flag.
  // The old `init.show_tooth` came from /init-procedure-screen, which never
  // returns it, so it silently defaulted to true and dentistry fields showed
  // for every specialty (e.g. physiotherapy). Read it off the event instead;
  // default to false so a missing flag hides the dental-only fields rather than
  // wrongly showing them.
  const showTooth = event.extendedProps?.show_tooth_number ?? false;
  const fullName = `${(event.name ?? '').trim()} ${(event.family ?? '').trim()}`.trim();
  // The order belongs to the appointment's date, not the day someone happens to
  // be entering it — the web reads the same field off the selected event
  // (OrdersModal.jsx:205). Stamping today instead recorded a 26 July visit as
  // 22 July, which also put the encounter in the wrong day's cashier queue and
  // revenue report. Fall back to today only if the event arrives without a
  // usable date, matching the popover's guard on the same field.
  const visitDate = /^\d{4}-\d{2}-\d{2}$/.test(event.visit_date ?? '')
    ? event.visit_date
    : todayYmd();
  const selectedProcedure = init?.procedures.find((p) => p.procedure_id === procedureId);
  const currency = selectedProcedure?.currency ?? init?.procedures[0]?.currency ?? '';
  const numericPrice = Number(price);
  const numericDiscount = Number(discount) || 0;
  const netPrice = Math.max(
    0,
    Number.isFinite(numericPrice) ? numericPrice - numericDiscount : 0,
  );

  const goBack = () => {
    clearEvent();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/calendar');
  };

  const resetForm = () => {
    setProcedureId(null);
    setPrice('');
    setToothCode(null);
    setDiscount('0');
    setStatus(null);
    setVisitNotes('');
    setFormError(null);
  };

  const addStaged = () => {
    setFormError(null);
    if (!selectedProcedure) {
      setFormError('Please select a procedure');
      return;
    }
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setFormError('Price must be a positive number');
      return;
    }
    // Status is only asked for (and required) on dental specialties. Non-dental
    // specialties record procedures as completed by default.
    if (showTooth && !status) {
      setFormError('Please select a status');
      return;
    }
    if (showTooth && !toothCode) {
      setFormError('Please select a tooth');
      return;
    }
    const selectedTooth = init?.toothlist.find((t) => t.code === toothCode);
    const rowStatus = showTooth ? status ?? '' : DEFAULT_NON_DENTAL_STATUS;

    const row: StagedProcedure = {
      key: `${selectedProcedure.procedure_id}-${Date.now()}-${staged.length}`,
      procedure_id: selectedProcedure.procedure_id,
      procDescription: selectedProcedure.description,
      procPrice: numericPrice,
      selectedTooth: selectedTooth?.description ?? '',
      discount: numericDiscount,
      status: rowStatus,
      visitNotes,
      currency: selectedProcedure.currency,
    };
    setStaged((prev) => [...prev, row]);
    resetForm();
  };

  const removeStaged = (key: string) => {
    setStaged((prev) => prev.filter((p) => p.key !== key));
  };

  const setStatusUpdate = (encounterId: number, newStatus: string) => {
    setStatusUpdates((prev) => ({ ...prev, [encounterId]: newStatus }));
  };

  const onSubmit = async () => {
    setSubmitError(null);
    if (staged.length === 0 && Object.keys(statusUpdates).length === 0) {
      setSubmitError('Add at least one procedure or change a status before submitting.');
      return;
    }
    // The clinician on the order is the doctor the appointment was booked with
    // — NOT the logged-in user. An owner can open Orders for another doctor's
    // appointment, so using user_name here would stamp every resulting bill
    // with the owner's name (wrong provider in All Unpaid Bills / cashier).
    // Fall back to user_name only when the appointment has no doctor assigned.
    const doctorName = event.doctor || user?.user_name || '';
    const clinicName = init?.procedures[0]?.clinic_name ?? '';
    const currency = init?.procedures[0]?.currency ?? 'USD';
    const mainId = event.extendedProps?.mainId ?? Number(event.id);

    const proceduresPayload: TreatmentPlanProcedure[] = staged.map((row, i) => ({
      procDescription: row.procDescription,
      procedure_id: row.procedure_id,
      procPrice: row.procPrice,
      selectedTooth: row.selectedTooth,
      discount: row.discount,
      status: row.status,
      visitNotes: row.visitNotes,
      visit_date: visitDate,
      bookingAppointmentId: mainId,
      doctorName,
      currency: row.currency || currency,
      bookingRandomCreatedId: String(mainId),
      clinicName,
      addingNewProcId: `${row.procedure_id}-${i}-${Date.now()}`,
    }));

    const inProcessPayload: StatusUpdateRequest[] = (pending?.procedures ?? [])
      .filter((p) => statusUpdates[p.encounterId])
      .map((p) => ({
        encounterId: p.encounterId,
        update_status: statusUpdates[p.encounterId],
        procedure: p.procedure,
        toothNum: p.toothNum,
        procedure_id: p.procedure_id,
        provider: p.provider,
        fees: p.fees,
        discount: p.discount,
        netPrice: p.netPrice,
        amountPaid: p.amountPaid,
        remainingBalance: p.remainingBalance,
        currency: p.currency,
      }));

    const payload: TreatmentPlanRequest = {
      patient_id: event.patientId,
      procedures: proceduresPayload,
      inProcessStatus: inProcessPayload,
      billID: inProcessPayload.map((p) => p.encounterId),
      doctor: doctorName,
      deliveryOptions: { email: false, whatsapp: false, print: false, save: true },
    };

    try {
      const res = await submitMutation.mutateAsync(payload);
      if (res.status === 'success') {
        setSuccessOpen(true);
      } else {
        setSubmitError(res.message || 'Could not save orders.');
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save orders.');
    }
  };

  if (initLoading) {
    return (
      <Screen contentContainerStyle={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary[500]} />
        </View>
      </Screen>
    );
  }

  // These three controls are laid out differently for dental vs. non-dental
  // specialties (see below), so they're defined once here to avoid duplicating
  // their props across both branches.
  const procedureField = (
    <Select<string>
      label="Select Procedure"
      placeholder="Search procedure…"
      value={procedureId}
      options={procedureOptions}
      onChange={(v) => setProcedureId(v)}
    />
  );
  const priceField = (
    <TextInput
      label="Price"
      placeholder="0"
      value={price}
      onChangeText={setPrice}
      keyboardType="decimal-pad"
      editable={false}
    />
  );
  const discountField = (
    <TextInput
      label="Discount"
      placeholder="0"
      value={discount}
      onChangeText={setDiscount}
      keyboardType="decimal-pad"
    />
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
          <Text style={styles.title}>Treatment & Orders</Text>
          <Text style={styles.subtitle}>{fullName || 'Patient'}</Text>
        </View>
      </View>

      <View style={styles.readOnlyRow}>
        <ReadOnlyField
          label="Clinician"
          value={formatDoctorName(event.doctor || user?.user_name) || '—'}
        />
        <ReadOnlyField label="Visit Date" value={visitDate} />
      </View>

      <View style={styles.formBlock}>
        {showTooth ? (
          <>
            {/* Dental: Procedure + Price, then Tooth + Discount. */}
            <View style={styles.row}>
              <View style={styles.flex2}>{procedureField}</View>
              <View style={styles.flex1}>{priceField}</View>
            </View>
            <View style={styles.row}>
              <View style={styles.flex2}>
                <Select<number>
                  label="Select Tooth"
                  placeholder="Select tooth…"
                  value={toothCode}
                  options={toothOptions}
                  onChange={(v) => setToothCode(v)}
                />
              </View>
              <View style={styles.flex1}>{discountField}</View>
            </View>
          </>
        ) : (
          <>
            {/* Non-dental: no tooth field, so Procedure spans full width and
                Price + Discount share a row — no blank column before Discount. */}
            {procedureField}
            <View style={styles.row}>
              <View style={styles.flex1}>{priceField}</View>
              <View style={styles.flex1}>{discountField}</View>
            </View>
          </>
        )}

        <View style={styles.netPriceRow}>
          <Text style={styles.netPriceLabel}>Net Price</Text>
          <Text style={styles.netPriceValue}>
            {selectedProcedure ? `${formatAmount(netPrice)} ${currency}`.trim() : '—'}
          </Text>
        </View>

        {/* Status only applies to dental specialties. Non-dental procedures
            are recorded as completed by default, so the picker is hidden. */}
        {showTooth ? (
          <Select<string>
            label="Select Status"
            placeholder="Select status…"
            value={status}
            options={statusOptions}
            onChange={(v) => setStatus(v)}
          />
        ) : null}

        <TextInput
          label="Visit Notes"
          placeholder="Clinical notes…"
          value={visitNotes}
          onChangeText={setVisitNotes}
          multiline
          numberOfLines={3}
          maxLength={500}
        />

        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

        <Button
          label="+ Add to list"
          variant="secondary"
          fullWidth={false}
          onPress={addStaged}
          style={styles.addBtn}
        />
      </View>

      {staged.length > 0 ? (
        <View style={styles.tableBlock}>
          <Text style={styles.sectionTitle}>Waiting validation</Text>
          {staged.map((row) => {
            const rowNet = Math.max(0, row.procPrice - (row.discount || 0));
            return (
              <View key={row.key} style={styles.stagedRow}>
                <View style={styles.stagedTextBlock}>
                  <Text style={styles.stagedProc} numberOfLines={1}>
                    {row.procDescription}
                  </Text>
                  <Text style={styles.stagedMeta} numberOfLines={1}>
                    {row.selectedTooth || '—'} · {row.status.replace(/_/g, ' ')}
                  </Text>
                  <Text style={styles.stagedMeta} numberOfLines={1}>
                    Price {formatAmount(row.procPrice)} · Disc {formatAmount(row.discount)} ·{' '}
                    <Text style={styles.stagedNet}>
                      Net {formatAmount(rowNet)} {row.currency}
                    </Text>
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove"
                  hitSlop={10}
                  onPress={() => removeStaged(row.key)}
                  style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}>
                  <Ionicons name="trash-outline" size={ms(20)} color={colors.danger[500]} />
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Pending procedures are a dental-workflow concept (in-process tooth
          treatments awaiting a status update), so only show the section for
          specialties that use the tooth chart — hidden for physiotherapy,
          esthetics, etc. Same specialty gate as the tooth/status fields. */}
      {showTooth ? (
        <View style={styles.tableBlock}>
          <Text style={styles.sectionTitle}>Pending procedures</Text>
          {pendingLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary[500]} />
            </View>
          ) : (pending?.procedures ?? []).length === 0 ? (
            <Text style={styles.emptyText}>No pending procedures for this patient.</Text>
          ) : (
            <View style={styles.pendingList}>
              {(pending?.procedures ?? []).map((p) => (
                <PendingCard
                  key={p.encounterId}
                  pending={p}
                  statusOptions={statusOptions}
                  selectedUpdate={statusUpdates[p.encounterId] ?? null}
                  onSelectUpdate={(v) => setStatusUpdate(p.encounterId, v)}
                />
              ))}
            </View>
          )}
        </View>
      ) : null}

      {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

      <View style={styles.actions}>
        <Button
          label="Cancel"
          variant="secondary"
          onPress={goBack}
          fullWidth={false}
          style={styles.flex1}
        />
        <Button
          label="Submit"
          loading={submitMutation.isPending}
          onPress={onSubmit}
          fullWidth={false}
          style={styles.flex1}
        />
      </View>

      <ConfirmDialog
        visible={successOpen}
        variant="success"
        title="Orders Saved"
        message={`${fullName || 'The patient'} has been added to the cashier queue.`}
        confirmLabel="Done"
        onConfirm={() => {
          setSuccessOpen(false);
          goBack();
        }}
      />
    </Screen>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readOnlyField}>
      <Text style={styles.readOnlyLabel}>{label}</Text>
      <View style={styles.readOnlyValueWrap}>
        <Text style={styles.readOnlyValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

// Card layout (replaces the previous horizontal-scroll table). The old
// table was 670px wide on a 360dp phone, which pushed the Status Update
// Select off-screen to the right — clients reported the control was
// "missing" because they never scrolled far enough to find it. Cards
// keep the Select inline and full-width.
function PendingCard({
  pending,
  statusOptions,
  selectedUpdate,
  onSelectUpdate,
}: {
  pending: PendingProcedure;
  statusOptions: SelectOption<string>[];
  selectedUpdate: string | null;
  onSelectUpdate: (v: string) => void;
}) {
  return (
    <View style={styles.pendingCard}>
      <View style={styles.pendingHeadRow}>
        <Text style={styles.pendingProcedure} numberOfLines={2}>
          {pending.procedure}
        </Text>
        <Text style={styles.pendingTooth}>{pending.toothNum || '—'}</Text>
      </View>
      <View style={styles.pendingMetaRow}>
        <Text style={styles.pendingMetaText}>{pending.encounterDate}</Text>
        <Text style={styles.pendingMetaText}>
          Status: {pending.status.replace(/_/g, ' ')}
        </Text>
        <Text style={styles.pendingMetaText}>
          Balance: {pending.remainingBalance}
        </Text>
      </View>
      <View style={styles.pendingSelectBlock}>
        <Select<string>
          label="Update status"
          placeholder="Select an update…"
          value={selectedUpdate}
          options={statusOptions}
          onChange={onSelectUpdate}
        />
      </View>
    </View>
  );
}

function todayYmd(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    gap: spacing.xl,
  },
  loading: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
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
  readOnlyRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  readOnlyField: {
    flex: 1,
    gap: spacing.xs,
  },
  readOnlyLabel: {
    ...typography.body.medium,
    fontFamily: 'Inter_500Medium',
    color: colors.neutral[500],
  },
  readOnlyValueWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: s(14),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.surface,
  },
  readOnlyValue: {
    ...typography.body.large,
    color: colors.neutral[500],
  },
  formBlock: {
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  addBtn: {
    alignSelf: 'flex-start',
    minWidth: s(140),
  },
  netPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.surface,
  },
  netPriceLabel: {
    ...typography.body.medium,
    fontFamily: 'Inter_500Medium',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  netPriceValue: {
    ...typography.title.large,
    fontFamily: 'Inter_700Bold',
    color: HEADING_COLOR,
    fontSize: ms(18),
    lineHeight: ms(24),
  },
  stagedNet: {
    ...typography.body.small,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
  },
  tableBlock: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.label.medium,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: {
    ...typography.body.medium,
    color: colors.text.secondary,
    paddingVertical: spacing.lg,
    textAlign: 'center',
  },
  stagedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background.surface,
  },
  stagedTextBlock: {
    flex: 1,
    gap: 2,
  },
  stagedProc: {
    ...typography.body.large,
    fontFamily: 'Inter_600SemiBold',
    color: colors.neutral[500],
  },
  stagedMeta: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  removeBtn: {
    width: s(36),
    height: s(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingList: {
    gap: spacing.md,
  },
  pendingCard: {
    borderRadius: s(12),
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.base,
    padding: spacing.md,
    gap: spacing.sm,
  },
  pendingHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  pendingProcedure: {
    flex: 1,
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    color: colors.neutral[500],
  },
  pendingTooth: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  pendingMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  pendingMetaText: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  pendingSelectBlock: {
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.body.medium,
    color: colors.danger[500],
    textAlign: 'center',
  },
  successText: {
    ...typography.body.medium,
    color: colors.success[500],
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
