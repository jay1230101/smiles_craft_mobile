import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Screen } from '@/components/screen';
import { Select, type SelectOption } from '@/components/select';
import { TextInput } from '@/components/text-input';
import { useDoctors } from '@/hooks/use-doctors';
import { useUpdateAppointment } from '@/hooks/use-update-appointment';
import { s } from '@/lib/responsive';
import { useEditEventStore } from '@/store/edit-event';
import { colors, radius, spacing, typography } from '@/theme';
import type { UpdateAppointmentRequest } from '@/types/appointments';

const DATE_REGEX = /^(\d{2})-(\d{2})-(\d{4})$/;
const TIME_REGEX = /^(\d{2}):(\d{2})$/;

const schema = z
  .object({
    date: z.string().trim().regex(DATE_REGEX, 'Use format DD-MM-YYYY'),
    startTime: z.string().trim().regex(TIME_REGEX, 'Use 24h format HH:MM'),
    endTime: z.string().trim().regex(TIME_REGEX, 'Use 24h format HH:MM'),
    doctor: z.number().int().positive('Doctor is required'),
    procedure: z.string().trim().min(1, 'Treatment is required'),
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
  const { data: doctors } = useDoctors();
  const updateAppointment = useUpdateAppointment();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Defensive: if the user lands here directly (e.g. deep link / restart) with
  // no event in the store, bounce back to the calendar.
  if (!event) {
    return <Redirect href="/(tabs)/calendar" />;
  }

  return (
    <EditForm
      event={event}
      doctors={doctors}
      router={router}
      clearEvent={clearEvent}
      updateAppointment={updateAppointment}
      serverError={serverError}
      setServerError={setServerError}
      successMessage={successMessage}
      setSuccessMessage={setSuccessMessage}
    />
  );
}

function EditForm({
  event,
  doctors,
  router,
  clearEvent,
  updateAppointment,
  serverError,
  setServerError,
  successMessage,
  setSuccessMessage,
}: {
  event: NonNullable<ReturnType<typeof useEditEventStore.getState>['event']>;
  doctors: ReturnType<typeof useDoctors>['data'];
  router: ReturnType<typeof useRouter>;
  clearEvent: () => void;
  updateAppointment: ReturnType<typeof useUpdateAppointment>;
  serverError: string | null;
  setServerError: (s: string | null) => void;
  successMessage: string | null;
  setSuccessMessage: (s: string | null) => void;
}) {
  const initialDefaults = useMemo<FormValues>(() => {
    const start = parseIsoSafe(event.start);
    const end = parseIsoSafe(event.end);
    return {
      date: start ? formatDdMmYyyy(start) : '',
      startTime: start ? formatHhMm(start) : '',
      endTime: end ? formatHhMm(end) : '',
      doctor: event.resourceId,
      procedure: event.extendedProps?.procedure ?? '',
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

  const doctorOptions: SelectOption<number>[] = useMemo(
    () =>
      (doctors ?? []).map((d) => ({
        value: d.id,
        label: `Dr. ${[d.name, d.family].filter(Boolean).join(' ').trim()}`,
      })),
    [doctors],
  );

  const goBack = () => {
    clearEvent();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/calendar');
    }
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setSuccessMessage(null);

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

    const selectedDoctor = (doctors ?? []).find((d) => d.id === values.doctor);
    const doctorName = selectedDoctor
      ? `${selectedDoctor.name} ${selectedDoctor.family}`.trim()
      : event.doctor;

    const payload: UpdateAppointmentRequest = {
      eventId: event.id,
      name: event.name,
      family: event.family,
      dob: normalizeDob(event.dob ?? ''),
      phone: stripPlus(event.phone ?? ''),
      date: dateIso,
      start_iso: startIso,
      end_iso: endIso,
      proc: values.procedure.trim(),
      resourceId: values.doctor,
      doctor_name: doctorName,
      booking_reminder: values.bookingReminder,
    };

    try {
      const res = await updateAppointment.mutateAsync(payload);
      if (res.status === 'success') {
        setSuccessMessage('Appointment updated.');
        setTimeout(() => goBack(), 700);
      } else {
        setServerError(res.message || 'Could not update appointment.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update appointment.';
      setServerError(message);
    }
  };

  const fullName = `${(event.name ?? '').trim()} ${(event.family ?? '').trim()}`.trim();

  return (
    <Screen contentContainerStyle={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={goBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={s(22)} color={colors.neutral[500]} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Edit appointment</Text>
          <Text style={styles.subtitle}>{fullName || 'Patient'}</Text>
        </View>
      </View>

      <View style={styles.formBlock}>
        <Controller
          control={control}
          name="date"
          render={({ field, fieldState }) => (
            <TextInput
              label="Date *"
              placeholder="DD-MM-YYYY"
              keyboardType="number-pad"
              value={field.value}
              onChangeText={(t) => field.onChange(formatDateMask(t))}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />

        <View style={styles.row}>
          <Controller
            control={control}
            name="startTime"
            render={({ field, fieldState }) => (
              <TextInput
                containerStyle={styles.flex}
                label="Start *"
                placeholder="HH:MM"
                keyboardType="number-pad"
                value={field.value}
                onChangeText={(t) => field.onChange(formatTimeMask(t))}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="endTime"
            render={({ field, fieldState }) => (
              <TextInput
                containerStyle={styles.flex}
                label="End *"
                placeholder="HH:MM"
                keyboardType="number-pad"
                value={field.value}
                onChangeText={(t) => field.onChange(formatTimeMask(t))}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
        </View>

        <Controller
          control={control}
          name="doctor"
          render={({ field, fieldState }) => (
            <Select<number>
              label="Doctor *"
              placeholder="Select doctor"
              value={field.value || null}
              options={doctorOptions}
              onChange={(v) => field.onChange(v)}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="procedure"
          render={({ field, fieldState }) => (
            <TextInput
              label="Treatment *"
              placeholder="e.g. Dental Cleaning"
              autoCapitalize="words"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="bookingReminder"
          render={({ field }) => (
            <View style={styles.reminderRow}>
              <Checkbox
                value={field.value}
                onChange={field.onChange}
                label="Send WhatsApp reminder to patient"
              />
            </View>
          )}
        />
      </View>

      {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}
      {successMessage ? <Text style={styles.serverSuccess}>{successMessage}</Text> : null}

      <View style={styles.actions}>
        <Button
          label="Cancel"
          variant="secondary"
          onPress={goBack}
          fullWidth={false}
          style={styles.flex}
        />
        <Button
          label="Save changes"
          loading={formState.isSubmitting || updateAppointment.isPending}
          onPress={handleSubmit(onSubmit)}
          fullWidth={false}
          style={styles.flex}
        />
      </View>
    </Screen>
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

function ddMmYyyyToIso(value: string): string | null {
  const m = value.match(DATE_REGEX);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

function combineDateAndTime(yyyymmdd: string, hhmm: string): string | null {
  const m = hhmm.match(TIME_REGEX);
  if (!m) return null;
  const [, hh, mm] = m;
  return `${yyyymmdd}T${hh}:${mm}:00`;
}

function parseTime(hhmm: string): number | null {
  const m = hhmm.match(TIME_REGEX);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function formatDateMask(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 4));
  if (digits.length > 4) parts.push(digits.slice(4, 8));
  return parts.join('-');
}

function formatTimeMask(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

// Backend stores DOB as "DD-Month-YYYY" (e.g. "14-August-1990"); convert back
// to "YYYY-MM-DD" before re-sending to /encounter.
function normalizeDob(dob: string): string {
  if (!dob) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) return dob;
  const parts = dob.split('-');
  if (parts.length !== 3) return dob;
  const [dd, monthName, yyyy] = parts;
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const idx = months.findIndex((m) => m.toLowerCase() === monthName.toLowerCase());
  if (idx < 0) return dob;
  return `${yyyy}-${String(idx + 1).padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

function stripPlus(phone: string): string {
  return phone.replace(/^\+/, '');
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backBtn: {
    width: s(40),
    height: s(40),
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.surface,
  },
  pressed: {
    opacity: 0.6,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.title.large,
    fontFamily: 'Inter_700Bold',
    color: colors.neutral[500],
  },
  subtitle: {
    ...typography.body.large,
    color: colors.text.secondary,
  },
  formBlock: {
    gap: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  reminderRow: {
    paddingVertical: spacing.xs,
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
});
