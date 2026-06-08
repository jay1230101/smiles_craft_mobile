import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/button';
import { Select, type SelectOption } from '@/components/select';
import { useCancelAppointment } from '@/hooks/use-cancel-appointment';
import { useCancellationReasons } from '@/hooks/use-cancellation-reasons';
import { deriveStatus, formatEventTime } from '@/lib/appointments';
import { ms, s } from '@/lib/responsive';
import { useEditEventStore } from '@/store/edit-event';
import { colors, radius, spacing, typography } from '@/theme';
import type { BackendEvent } from '@/types/appointments';

type Props = {
  event: BackendEvent | null;
  onClose: () => void;
};

type Pane = 'details' | 'cancel';

export function AppointmentPopover({ event, onClose }: Props) {
  const visible = !!event;
  const [pane, setPane] = useState<Pane>('details');
  const [reasonId, setReasonId] = useState<number | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const { data: reasons, isLoading: reasonsLoading } = useCancellationReasons();
  const cancelAppt = useCancelAppointment();
  const router = useRouter();
  const setEditEvent = useEditEventStore((s) => s.setEvent);

  // Reset internal state every time a new event is opened.
  useEffect(() => {
    if (visible) {
      setPane('details');
      setReasonId(null);
      setReasonError(null);
      setActionMessage(null);
    }
  }, [visible, event?.extendedProps?.mainId]);

  const reasonOptions: SelectOption<number>[] = useMemo(
    () => (reasons ?? []).map((r) => ({ value: r.id, label: r.reason })),
    [reasons],
  );

  if (!event) return null;

  const status = deriveStatus(event);
  const isCancelled = status === 'cancelled';
  const isConfirmed = status === 'confirmed';

  const fullName = `${(event.name ?? '').trim()} ${(event.family ?? '').trim()}`.trim();
  const timeRange = `${formatEventTime(event.start)} - ${formatEventTime(event.end)}`;
  const procedure = event.extendedProps?.procedure ?? '';
  const doctor = event.doctor ? `Dr. ${event.doctor}` : '';
  const mainId = event.extendedProps?.mainId ?? Number(event.id);
  const patientId = event.patientId;
  const doctorId = event.resourceId;

  const submitCancel = async () => {
    if (!reasonId) {
      setReasonError('Pick a cancellation reason');
      return;
    }
    setReasonError(null);
    setActionMessage(null);
    try {
      const res = await cancelAppt.mutateAsync({
        patientId,
        bookingId: mainId,
        doctorId,
        reason: reasonId,
      });
      if (res.status === 'success') {
        setActionMessage('Appointment cancelled.');
        // Close after a short beat so the user sees confirmation.
        setTimeout(() => onClose(), 700);
      } else {
        setReasonError(res.message || 'Could not cancel appointment.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not cancel appointment.';
      setReasonError(message);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {fullName || 'Appointment'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}>
              <Ionicons name="close" size={s(22)} color={colors.neutral[500]} />
            </Pressable>
          </View>

          <View style={styles.statusRow}>
            <StatusPill status={status} />
          </View>

          {pane === 'details' ? (
            <>
              <View style={styles.detailsBlock}>
                <DetailRow icon="time-outline" label="Time" value={timeRange} />
                {procedure ? (
                  <DetailRow icon="medical-outline" label="Treatment" value={procedure} />
                ) : null}
                {doctor ? (
                  <DetailRow icon="person-outline" label="Doctor" value={doctor} />
                ) : null}
              </View>

              {actionMessage ? (
                <Text style={styles.successText}>{actionMessage}</Text>
              ) : null}

              <View style={styles.actionsBlock}>
                <ActionButton
                  icon="checkmark-circle-outline"
                  label={isConfirmed ? 'Confirmed' : 'Confirm appointment'}
                  helper="Manual confirm needs a backend update"
                  disabled
                />
                <ActionButton
                  icon="create-outline"
                  label="Edit / Reschedule"
                  disabled={isCancelled}
                  helper={isCancelled ? 'Cancelled appointments can’t be edited' : undefined}
                  onPress={() => {
                    setEditEvent(event);
                    onClose();
                    // Typed routes are regenerated by the dev server; this
                    // route is registered in app/_layout.tsx.
                    router.push('/appointment-edit' as never);
                  }}
                />
                <ActionButton
                  icon="card-outline"
                  label="Charge / Take payment"
                  helper="Available with the Billing module (M4)"
                  disabled
                />
                <ActionButton
                  icon="close-circle-outline"
                  label="Cancel appointment"
                  variant="danger"
                  disabled={isCancelled}
                  helper={isCancelled ? 'Already cancelled' : undefined}
                  onPress={() => setPane('cancel')}
                />
              </View>
            </>
          ) : (
            <View style={styles.cancelPane}>
              <Text style={styles.panePrompt}>
                Why are you cancelling this appointment?
              </Text>

              {reasonsLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={colors.primary[500]} />
                </View>
              ) : (
                <Select<number>
                  label="Cancellation reason *"
                  placeholder="Select a reason"
                  value={reasonId}
                  options={reasonOptions}
                  onChange={(v) => {
                    setReasonId(v);
                    setReasonError(null);
                  }}
                  error={reasonError}
                />
              )}

              <View style={styles.cancelActions}>
                <Button
                  label="Back"
                  variant="secondary"
                  onPress={() => setPane('details')}
                  fullWidth={false}
                  style={styles.flex}
                />
                <Button
                  label="Cancel appointment"
                  loading={cancelAppt.isPending}
                  onPress={submitCancel}
                  fullWidth={false}
                  style={styles.flex}
                />
              </View>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={s(18)} color={colors.text.secondary} />
      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  helper,
  onPress,
  disabled,
  variant = 'neutral',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  helper?: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'neutral' | 'danger';
}) {
  const tint =
    variant === 'danger' && !disabled ? colors.danger[500] : colors.neutral[500];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        pressed && !disabled && styles.actionPressed,
        disabled && styles.actionDisabled,
      ]}>
      <Ionicons name={icon} size={s(22)} color={disabled ? colors.text.secondary : tint} />
      <View style={styles.actionTextBlock}>
        <Text style={[styles.actionLabel, { color: disabled ? colors.text.secondary : tint }]}>
          {label}
        </Text>
        {helper ? <Text style={styles.actionHelper}>{helper}</Text> : null}
      </View>
      {!disabled ? (
        <Ionicons name="chevron-forward" size={s(18)} color={colors.text.secondary} />
      ) : null}
    </Pressable>
  );
}

function StatusPill({ status }: { status: 'confirmed' | 'cancelled' | 'unconfirmed' }) {
  const { bg, color, label } = statusStyle(status);
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

function statusStyle(status: 'confirmed' | 'cancelled' | 'unconfirmed') {
  switch (status) {
    case 'confirmed':
      return { bg: colors.success[0], color: colors.success[500], label: 'Confirmed' };
    case 'cancelled':
      return { bg: colors.danger[10], color: colors.danger[500], label: 'Cancelled' };
    case 'unconfirmed':
    default:
      return { bg: colors.warning[10], color: colors.warning[500], label: 'Unconfirmed' };
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background.base,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    maxHeight: '90%',
    gap: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: s(40),
    height: s(4),
    borderRadius: 999,
    backgroundColor: colors.border.default,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    ...typography.title.large,
    fontFamily: 'Inter_700Bold',
    color: colors.neutral[500],
    flex: 1,
  },
  closeBtn: {
    width: s(36),
    height: s(36),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  pressed: {
    opacity: 0.6,
  },
  statusRow: {
    flexDirection: 'row',
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  pillText: {
    ...typography.label.small,
    fontSize: ms(11),
  },
  detailsBlock: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailText: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  detailValue: {
    ...typography.body.large,
    fontFamily: 'Inter_600SemiBold',
    color: colors.neutral[500],
  },
  successText: {
    ...typography.body.medium,
    color: colors.success[500],
    textAlign: 'center',
  },
  actionsBlock: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background.surface,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionDisabled: {
    opacity: 0.6,
  },
  actionTextBlock: {
    flex: 1,
    gap: 2,
  },
  actionLabel: {
    ...typography.body.large,
    fontFamily: 'Inter_600SemiBold',
  },
  actionHelper: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  cancelPane: {
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  panePrompt: {
    ...typography.body.large,
    color: colors.neutral[500],
  },
  loadingRow: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  cancelActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
