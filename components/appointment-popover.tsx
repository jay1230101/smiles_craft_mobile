import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

export function AppointmentPopover({ event, onClose }: Props) {
  const visible = !!event;

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

  if (!event) return null;

  // Cancelled appointments never reach this popover — the calendar swallows
  // taps on them (matching the web app), so there is no cancel/reschedule
  // action here at all.
  const status = deriveStatus(event);

  const fullName = `${(event.name ?? '').trim()} ${(event.family ?? '').trim()}`.trim();
  const medicalHistory = (event.extendedProps?.medical_history ?? '').trim();
  const timeRange = `${formatEventTime(event.start)} - ${formatEventTime(event.end)}`;
  const procedure = event.extendedProps?.procedure ?? '';
  const doctor = formatDoctorName(event.doctor);
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

          {/* Patient's medical history in red, directly under the name, so
              staff see allergies/conditions at a glance when they open an
              appointment. */}
          {medicalHistory ? (
            <Text style={styles.medicalHistory} numberOfLines={2}>
              {medicalHistory}
            </Text>
          ) : null}

          <View style={styles.statusRow}>
            <StatusPill status={status} />
          </View>

          {/* The action list can be taller than the sheet's maxHeight (many
              actions + large accessibility fonts + Android gesture inset), so
              make it scrollable — otherwise the last rows clip off-screen with
              no way to reach them. */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: sheetBottomPadding }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <View style={styles.detailsBlock}>
              <DetailRow icon="time-outline" label="Time" value={timeRange} />
              {procedure ? (
                <DetailRow icon="medical-outline" label="Treatment" value={procedure} />
              ) : null}
              {doctor ? (
                <DetailRow icon="person-outline" label="Doctor" value={doctor} />
              ) : null}
            </View>

            <View style={styles.actionsBlock}>
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
              {/* No staff-facing confirm or cancel action by design: an
                  appointment is confirmed / cancelled only by the patient via
                  the WhatsApp reminder (views.py:1506 is the sole writer of
                  patient_confirmed). The status pill above reflects that. */}
            </View>
          </ScrollView>
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
    // Bottom padding lives on the ScrollView content so the last action can
    // scroll clear of the Android gesture bar; the sheet itself ends flush.
    paddingBottom: 0,
    paddingHorizontal: spacing.xl,
    maxHeight: '90%',
    gap: spacing.md,
  },
  // flexShrink lets the list shrink within the sheet's maxHeight and scroll
  // instead of forcing the sheet past its cap and clipping the tail.
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
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
  medicalHistory: {
    ...typography.body.medium,
    fontFamily: 'Inter_600SemiBold',
    color: colors.danger[500],
    marginTop: -spacing.xs,
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
});
