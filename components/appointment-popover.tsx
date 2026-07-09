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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Select, type SelectOption } from '@/components/select';
import { useCancelAppointment } from '@/hooks/use-cancel-appointment';
import { useCancellationReasons } from '@/hooks/use-cancellation-reasons';
import { deriveStatus, formatDoctorName, formatEventTime } from '@/lib/appointments';
import { ms, s } from '@/lib/responsive';
import { useActiveAppointmentStore } from '@/store/active-appointment';
import { useEditEventStore } from '@/store/edit-event';
import { useNewAppointmentStore } from '@/store/new-appointment';
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
  const setActiveEvent = useActiveAppointmentStore((s) => s.setEvent);
  const setNewAppointmentPrefill = useNewAppointmentStore((s) => s.setPrefill);

  // The bottom sheet bypasses SafeAreaView, so on Android phones with a
  // gesture bar (Samsung S25 in particular) the action row sits flush
  // against the system bar. Add the bottom inset on top of the existing
  // paddingBottom so the buttons float above the gesture pill.
  const insets = useSafeAreaInsets();
  const sheetBottomPadding = insets.bottom + spacing.xxl;

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
  const doctor = formatDoctorName(event.doctor);
  const mainId = event.extendedProps?.mainId ?? Number(event.id);
  const patientId = event.patientId;
  const doctorId = event.resourceId;

  const bookAnotherHere = () => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    const ymd = (event.visit_date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const ddmmyyyy = ymd ? `${ymd[3]}-${ymd[2]}-${ymd[1]}` : '';
    const hhmm = (d: Date) =>
      `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    // resourceId is typed as a number but /getAllEvents actually returns it as a
    // string (see lib/appointments.ts). The doctor Select matches on a numeric
    // id and the new-appointment form validates doctorId with z.number(), so a
    // raw string would leave the Clinician field unselected and block submit.
    // Normalize the same way matchesDoctor() does.
    const numericDoctorId =
      doctorId != null && String(doctorId).trim() !== '' ? Number(doctorId) : NaN;
    setNewAppointmentPrefill({
      date: ddmmyyyy,
      startTime: isNaN(start.getTime()) ? '09:00' : hhmm(start),
      endTime: isNaN(end.getTime()) ? '10:00' : hhmm(end),
      doctorId: Number.isFinite(numericDoctorId) ? numericDoctorId : null,
      doctorName: event.doctor ?? null,
    });
    onClose();
    router.push('/appointment-new' as never);
  };

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
        setActionMessage(isCancelled ? 'Reason updated.' : 'Appointment cancelled.');
        setTimeout(() => onClose(), 700);
      } else {
        setReasonError(
          res.message ||
            (isCancelled ? 'Could not update reason.' : 'Could not cancel appointment.'),
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not cancel appointment.';
      setReasonError(message);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: sheetBottomPadding }]} onPress={() => {}}>
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
                {isCancelled ? (
                  <ActionButton
                    icon="create-outline"
                    label="Change cancel reason"
                    helper="Update the reason this appointment was cancelled"
                    onPress={() => setPane('cancel')}
                  />
                ) : (
                  <>
                    <ActionButton
                      icon="duplicate-outline"
                      label="Book another at this time"
                      helper="Book a second appointment in the same slot"
                      onPress={bookAnotherHere}
                    />
                    <ActionButton
                      icon="add-circle-outline"
                      label="Orders"
                      onPress={() => {
                        setActiveEvent(event);
                        onClose();
                        router.push('/orders' as never);
                      }}
                    />
                    <ActionButton
                      icon="medkit-outline"
                      label="New Plan of Care"
                      onPress={() => {
                        setActiveEvent(event);
                        onClose();
                        router.push('/plan-of-care' as never);
                      }}
                    />
                    <ActionButton
                      icon="chatbubbles-outline"
                      label="Schedule Future WhatsApp"
                      onPress={() => {
                        setActiveEvent(event);
                        onClose();
                        router.push('/schedule-whatsapp' as never);
                      }}
                    />
                    <ActionButton
                      icon="create-outline"
                      label="Edit / Reschedule"
                      onPress={() => {
                        setEditEvent(event);
                        onClose();
                        router.push('/appointment-edit' as never);
                      }}
                    />
                    <ActionButton
                      icon="library-outline"
                      label="Clinical history"
                      onPress={() => {
                        setActiveEvent(event);
                        onClose();
                        router.push('/clinical-history' as never);
                      }}
                    />
                    <ActionButton
                      icon="close-circle-outline"
                      label="Cancel appointment"
                      variant="danger"
                      onPress={() => setPane('cancel')}
                    />
                    <ActionButton
                      icon="checkmark-circle-outline"
                      label={isConfirmed ? 'Confirmed' : 'Confirm appointment'}
                      helper="Manual confirm needs a backend update"
                      disabled
                    />
                  </>
                )}
              </View>
            </>
          ) : (
            <View style={styles.cancelPane}>
              <Text style={styles.panePrompt}>
                {isCancelled
                  ? 'Update the cancellation reason for this appointment.'
                  : 'Why are you cancelling this appointment?'}
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
                  label={isCancelled ? 'Update reason' : 'Cancel appointment'}
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
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
