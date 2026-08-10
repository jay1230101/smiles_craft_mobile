import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DateField } from '@/components/date-field';
import { Screen } from '@/components/screen';
import { TextInput } from '@/components/text-input';
import { TimeField } from '@/components/time-field';
import { useDeleteAppointment } from '@/hooks/use-delete-appointment';
import { useSearchPatients } from '@/hooks/use-search-patients';
import { useUpdateAppointment } from '@/hooks/use-update-appointment';
import {
  APPOINTMENT_MAX_DATE,
  APPOINTMENT_MIN_DATE,
  combineDateAndTime,
  DATE_REGEX,
  ddMmYyyyToIso,
  ensureLeadingPlus,
  formatDobDisplay,
  normalizeDob,
  parseTime,
  TIME_REGEX,
} from '@/lib/appointment-format';
import { formatDoctorName } from '@/lib/appointments';
import { ms, s } from '@/lib/responsive';
import { useEditEventStore } from '@/store/edit-event';
import { colors, radius, spacing, typography } from '@/theme';
import type { UpdateAppointmentRequest } from '@/types/appointments';
import type { PatientListItem } from '@/types/patients';

const HEADING_COLOR = '#1A202C';
const SUBTITLE_COLOR = '#64748B';

const schema = z
  .object({
    date: z.string().trim().regex(DATE_REGEX, 'Use format DD-MM-YYYY'),
    startTime: z.string().trim().regex(TIME_REGEX, 'Use 24h format HH:MM'),
    endTime: z.string().trim().regex(TIME_REGEX, 'Use 24h format HH:MM'),
    notes: z.string().trim(),
    bookingReminder: z.boolean(),
  })
  .refine(
    (data) => {
      const start = parseTime(data.startTime);
      const end = parseTime(data.endTime);
      if (!start || !end) return true;
      return end > start;
    },
    { message: 'End time must be after start time', path: ['endTime'] },
  );

type FormValues = z.infer<typeof schema>;

export default function AppointmentEditScreen() {
  const router = useRouter();
  const event = useEditEventStore((s) => s.event);
  const clearEvent = useEditEventStore((s) => s.clear);
  const updateAppointment = useUpdateAppointment();
  const deleteAppointment = useDeleteAppointment();
  const [serverError, setServerError] = useState<string | null>(null);
  const [savedOpen, setSavedOpen] = useState(false);
  const [deletedOpen, setDeletedOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [swappedPatient, setSwappedPatient] = useState<PatientListItem | null>(null);

  if (!event) {
    return <Redirect href="/(tabs)/calendar" />;
  }

  return (
    <EditForm
      event={event}
      router={router}
      clearEvent={clearEvent}
      updateAppointment={updateAppointment}
      deleteAppointment={deleteAppointment}
      serverError={serverError}
      setServerError={setServerError}
      savedOpen={savedOpen}
      setSavedOpen={setSavedOpen}
      deletedOpen={deletedOpen}
      setDeletedOpen={setDeletedOpen}
      deleteOpen={deleteOpen}
      setDeleteOpen={setDeleteOpen}
      swappedPatient={swappedPatient}
      setSwappedPatient={setSwappedPatient}
    />
  );
}

function EditForm({
  event,
  router,
  clearEvent,
  updateAppointment,
  deleteAppointment,
  serverError,
  setServerError,
  savedOpen,
  setSavedOpen,
  deletedOpen,
  setDeletedOpen,
  deleteOpen,
  setDeleteOpen,
  swappedPatient,
  setSwappedPatient,
}: {
  event: NonNullable<ReturnType<typeof useEditEventStore.getState>['event']>;
  router: ReturnType<typeof useRouter>;
  clearEvent: () => void;
  updateAppointment: ReturnType<typeof useUpdateAppointment>;
  deleteAppointment: ReturnType<typeof useDeleteAppointment>;
  serverError: string | null;
  setServerError: (s: string | null) => void;
  savedOpen: boolean;
  setSavedOpen: (b: boolean) => void;
  deletedOpen: boolean;
  setDeletedOpen: (b: boolean) => void;
  deleteOpen: boolean;
  setDeleteOpen: (b: boolean) => void;
  swappedPatient: PatientListItem | null;
  setSwappedPatient: (p: PatientListItem | null) => void;
}) {
  const initialDefaults = useMemo<FormValues>(() => {
    const start = parseIsoSafe(event.start);
    const end = parseIsoSafe(event.end);
    return {
      date: start ? formatDdMmYyyy(start) : '',
      startTime: start ? formatHhMm(start) : '',
      endTime: end ? formatHhMm(end) : '',
      notes: event.extendedProps?.procedure ?? '',
      bookingReminder: false,
    };
  }, [event]);

  const { control, handleSubmit, formState, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialDefaults,
    mode: 'onTouched',
  });

  useEffect(() => {
    reset(initialDefaults);
  }, [initialDefaults, reset]);

  // Active patient = the swap target if one was picked, otherwise the event's
  // original patient. Display + submit pull from this single source.
  const activePatient = useMemo(
    () => ({
      name: swappedPatient?.name ?? event.name,
      family: swappedPatient?.family ?? event.family,
      dob: swappedPatient?.dob ?? event.dob ?? '',
      phone: swappedPatient?.phone ?? event.phone ?? '',
    }),
    [swappedPatient, event],
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedTerm(searchTerm), 400);
    return () => clearTimeout(id);
  }, [searchTerm]);

  const { data: searchResults, isFetching: searchLoading } = useSearchPatients(debouncedTerm);

  const goBack = () => {
    clearEvent();
    setSwappedPatient(null);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/calendar');
    }
  };

  const goToRegister = () => {
    clearEvent();
    setSwappedPatient(null);
    router.replace('/patient-register' as never);
  };

  const handleSelectPatient = (p: PatientListItem) => {
    setSwappedPatient(p);
    setSearchTerm('');
    setDebouncedTerm('');
  };

  const handleClearSwap = () => {
    setSwappedPatient(null);
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);

    const dateIso = ddMmYyyyToIso(values.date);
    if (!dateIso) {
      setServerError('Invalid date.');
      return;
    }
    const startIso = combineDateAndTime(dateIso, values.startTime);
    const endIso = combineDateAndTime(dateIso, values.endTime);
    if (!startIso || !endIso) {
      setServerError('Invalid time.');
      return;
    }

    const payload: UpdateAppointmentRequest = {
      eventId: event.id,
      name: activePatient.name,
      family: activePatient.family,
      dob: normalizeDob(activePatient.dob),
      // Backend stores phone with a leading "+" (see /register-patient),
      // so the patient lookup in /encounter compares against "+9615566787".
      // Send exactly that — stripping "+" caused "patient not registered".
      phone: ensureLeadingPlus(activePatient.phone),
      date: dateIso,
      start_iso: startIso,
      end_iso: endIso,
      proc: values.notes.trim(),
      resourceId: event.resourceId,
      doctor_name: event.doctor,
      booking_reminder: values.bookingReminder,
    };

    try {
      const res = await updateAppointment.mutateAsync(payload);
      if (res.status === 'success') {
        setSavedOpen(true);
      } else {
        setServerError(res.message || 'Could not update appointment.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update appointment.';
      setServerError(message);
    }
  };

  const onConfirmDelete = async () => {
    setServerError(null);
    try {
      const res = await deleteAppointment.mutateAsync({ eventToDelete: event.id });
      setDeleteOpen(false);
      if (res.status === 'deleted') {
        setDeletedOpen(true);
      } else {
        setServerError(res.message || 'Could not delete appointment.');
      }
    } catch (err) {
      setDeleteOpen(false);
      const message = err instanceof Error ? err.message : 'Could not delete appointment.';
      setServerError(message);
    }
  };

  const fullName = `${(activePatient.name ?? '').trim()} ${(activePatient.family ?? '').trim()}`.trim();
  const dobDisplay = formatDobDisplay(activePatient.dob);
  const showResults = debouncedTerm.trim().length >= 2;

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
          <Text style={styles.title}>Edit appointment</Text>
          <Text style={styles.subtitle}>{fullName || 'Patient'}</Text>
        </View>
      </View>

      <View style={styles.topActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Register a new patient"
          onPress={goToRegister}
          style={({ pressed }) => [styles.registerLink, pressed && styles.pressed]}>
          <Ionicons name="add-circle-outline" size={ms(18)} color={colors.primary[500]} />
          <Text style={styles.registerLinkText}>Register Patient</Text>
        </Pressable>
        <TextInput
          containerStyle={styles.searchInput}
          placeholder="Search Patients ..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {showResults ? (
        <View style={styles.resultsBox}>
          {searchLoading ? (
            <View style={styles.resultsLoading}>
              <ActivityIndicator color={colors.primary[500]} />
            </View>
          ) : (searchResults ?? []).length === 0 ? (
            <Text style={styles.resultsEmpty}>No patients matched.</Text>
          ) : (
            (searchResults ?? []).slice(0, 6).map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`Use ${p.name} ${p.family ?? ''}`}
                onPress={() => handleSelectPatient(p)}
                style={({ pressed }) => [styles.resultRow, pressed && styles.resultPressed]}>
                <Ionicons name="person-circle-outline" size={ms(22)} color={colors.text.secondary} />
                <View style={styles.resultText}>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {p.name} {p.family ?? ''}
                  </Text>
                  <Text style={styles.resultMeta} numberOfLines={1}>
                    {p.phone || '—'}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.patientBlock}>
        <View style={styles.patientHeadRow}>
          <Text style={styles.sectionLabel}>Patient</Text>
          {swappedPatient ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Undo patient swap"
              onPress={handleClearSwap}
              style={({ pressed }) => [styles.swapBadge, pressed && styles.pressed]}>
              <Ionicons name="swap-horizontal" size={ms(14)} color={colors.primary[500]} />
              <Text style={styles.swapBadgeText}>Swapped — undo</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.row}>
          <ReadOnlyField label="Name" value={activePatient.name || '—'} style={styles.flex} />
          <ReadOnlyField label="Family" value={activePatient.family || '—'} style={styles.flex} />
        </View>
        <ReadOnlyField label="Date of birth" value={dobDisplay || '—'} />
      </View>

      <View style={styles.formBlock}>
        <Text style={styles.sectionLabel}>Schedule</Text>

        <Controller
          control={control}
          name="date"
          render={({ field, fieldState }) => (
            <DateField
              label="Date *"
              placeholder="DD-MM-YYYY"
              value={field.value}
              onChange={field.onChange}
              minimumDate={APPOINTMENT_MIN_DATE}
              maximumDate={APPOINTMENT_MAX_DATE}
              error={fieldState.error?.message}
            />
          )}
        />

        <View style={styles.row}>
          <Controller
            control={control}
            name="startTime"
            render={({ field, fieldState }) => (
              <TimeField
                containerStyle={styles.flex}
                label="Start *"
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="endTime"
            render={({ field, fieldState }) => (
              <TimeField
                containerStyle={styles.flex}
                label="End *"
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
        </View>

        <Controller
          control={control}
          name="notes"
          render={({ field, fieldState }) => (
            <TextInput
              label="Notes"
              placeholder="Add notes for this visit"
              autoCapitalize="sentences"
              multiline
              numberOfLines={3}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              maxLength={500}
              error={fieldState.error?.message}
            />
          )}
        />

        <ReadOnlyField label="Doctor" value={formatDoctorName(event.doctor) || '—'} />

        <Controller
          control={control}
          name="bookingReminder"
          render={({ field }) => (
            <View style={styles.reminderRow}>
              <Checkbox
                value={field.value}
                onChange={field.onChange}
                label="Send WhatsApp reminder"
              />
            </View>
          )}
        />
      </View>

      {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

      <View style={styles.actions}>
        <Button
          label="Close"
          variant="secondary"
          onPress={goBack}
          fullWidth={false}
          style={styles.flex}
        />
        <Button
          label="Save"
          loading={formState.isSubmitting || updateAppointment.isPending}
          onPress={handleSubmit(onSubmit)}
          fullWidth={false}
          style={styles.flex}
        />
      </View>

      <Button
        label="Delete appointment"
        variant="danger"
        onPress={() => setDeleteOpen(true)}
        leftIcon={
          <Ionicons name="trash-outline" size={ms(18)} color={colors.text.inverse} />
        }
        style={styles.deleteBtn}
      />

      <ConfirmDialog
        visible={deleteOpen}
        variant="danger"
        title="Delete this appointment?"
        message="This will remove the appointment from the calendar. This action can't be undone."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        loading={deleteAppointment.isPending}
        onConfirm={onConfirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      <ConfirmDialog
        visible={savedOpen}
        variant="success"
        title="Appointment Updated"
        message={`${fullName || 'The appointment'} has been saved.`}
        confirmLabel="Done"
        onConfirm={() => {
          setSavedOpen(false);
          goBack();
        }}
      />

      <ConfirmDialog
        visible={deletedOpen}
        variant="success"
        title="Appointment Deleted"
        message={`${fullName || 'The appointment'} has been removed from the calendar.`}
        confirmLabel="Done"
        onConfirm={() => {
          setDeletedOpen(false);
          goBack();
        }}
      />
    </Screen>
  );
}

function ReadOnlyField({
  label,
  value,
  style,
}: {
  label: string;
  value: string;
  style?: object;
}) {
  return (
    <View style={[styles.readOnlyField, style]}>
      <Text style={styles.readOnlyLabel}>{label}</Text>
      <View style={styles.readOnlyValueWrap}>
        <Text style={styles.readOnlyValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

// ---------- helpers ----------

function parseIsoSafe(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function formatDdMmYyyy(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatHhMm(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// Shared date/time & DOB/phone helpers live in lib/appointment-format.ts.

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    gap: spacing.xl,
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
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  registerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  registerLinkText: {
    ...typography.label.large,
    color: colors.primary[500],
    fontFamily: 'Inter_600SemiBold',
  },
  searchInput: {
    flex: 1,
  },
  resultsBox: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingVertical: spacing.xs,
  },
  resultsLoading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  resultsEmpty: {
    ...typography.body.medium,
    color: colors.text.secondary,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  resultPressed: {
    opacity: 0.7,
  },
  resultText: {
    flex: 1,
    gap: 2,
  },
  resultName: {
    ...typography.body.large,
    fontFamily: 'Inter_500Medium',
    color: colors.neutral[500],
  },
  resultMeta: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing.xs,
  },
  patientBlock: {
    gap: spacing.md,
  },
  patientHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  swapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: s(6),
    borderRadius: radius.pill,
    backgroundColor: colors.primary[0],
  },
  swapBadgeText: {
    ...typography.body.small,
    color: colors.primary[500],
    fontFamily: 'Inter_600SemiBold',
  },
  formBlock: {
    gap: spacing.lg,
  },
  sectionLabel: {
    ...typography.body.medium,
    fontFamily: 'Inter_600SemiBold',
    color: colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  readOnlyField: {
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
  reminderRow: {
    borderWidth: 2,
    borderColor: colors.primary[500],
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary[0],
  },
  serverError: {
    ...typography.body.medium,
    color: colors.danger[500],
    textAlign: 'center',
  },
  serverSuccess: {
    ...typography.body.medium,
    color: colors.success[500],
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  deleteBtn: {
    backgroundColor: colors.danger[500],
    borderColor: colors.danger[500],
  },
});
