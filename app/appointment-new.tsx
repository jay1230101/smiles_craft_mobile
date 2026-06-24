import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Screen } from '@/components/screen';
import { Select, type SelectOption } from '@/components/select';
import { TextInput } from '@/components/text-input';
import { useCreateAppointment } from '@/hooks/use-create-appointment';
import { useMappedDoctors } from '@/hooks/use-mapped-doctors';
import { useSearchPatients } from '@/hooks/use-search-patients';
import { mappedDoctorDisplayName } from '@/types/doctors';
import { ms, s } from '@/lib/responsive';
import { useNewAppointmentStore } from '@/store/new-appointment';
import { colors, radius, spacing, typography } from '@/theme';
import type { CreateAppointmentRequest } from '@/types/appointments';
import type { PatientListItem } from '@/types/patients';

// RFC 4122 v4-style id. Backend stores this as encounter_id and we MUST
// send a fresh one for every new booking — otherwise the /encounter handler
// runs filter_by(encounter_id=None) and matches the first existing booking
// with a NULL encounter_id, taking the UPDATE branch and overwriting it.
function generateEventId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const HEADING_COLOR = '#1A202C';
const SUBTITLE_COLOR = '#64748B';

const DATE_REGEX = /^(\d{2})-(\d{2})-(\d{4})$/;
const TIME_REGEX = /^(\d{2}):(\d{2})$/;

const schema = z
  .object({
    date: z.string().trim().regex(DATE_REGEX, 'Use format DD-MM-YYYY'),
    startTime: z.string().trim().regex(TIME_REGEX, 'Use 24h format HH:MM'),
    endTime: z.string().trim().regex(TIME_REGEX, 'Use 24h format HH:MM'),
    doctorId: z.number().int().positive('Pick a doctor'),
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

export default function AppointmentNewScreen() {
  const router = useRouter();
  const prefill = useNewAppointmentStore((s) => s.prefill);
  const clearPrefill = useNewAppointmentStore((s) => s.clear);
  const createAppointment = useCreateAppointment();
  const { data: doctors, isLoading: doctorsLoading, isError: doctorsError } = useMappedDoctors();

  const [selectedPatient, setSelectedPatient] = useState<PatientListItem | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [patientError, setPatientError] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedTerm(searchTerm), 400);
    return () => clearTimeout(id);
  }, [searchTerm]);

  const { data: searchResults, isFetching: searchLoading } = useSearchPatients(debouncedTerm);

  const defaultValues = useMemo<FormValues>(() => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const todayDdMm = `${dd}-${mm}-${yyyy}`;
    const nextHour = (now.getHours() + 1) % 24;
    const nextHourStr = String(nextHour).padStart(2, '0');
    return {
      date: prefill?.date ?? todayDdMm,
      startTime: prefill?.startTime ?? `${nextHourStr}:00`,
      endTime: prefill?.endTime ?? `${String((nextHour + 1) % 24).padStart(2, '0')}:00`,
      doctorId: prefill?.doctorId ?? 0,
      notes: '',
      bookingReminder: false,
    };
  }, [prefill]);

  const { control, handleSubmit, formState, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onTouched',
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const doctorOptions: SelectOption<number>[] = useMemo(
    () =>
      (doctors ?? []).map((d) => ({
        value: d.id,
        label: mappedDoctorDisplayName(d),
      })),
    [doctors],
  );

  const goBack = () => {
    clearPrefill();
    setSelectedPatient(null);
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/calendar');
  };

  const goToRegister = () => {
    clearPrefill();
    setSelectedPatient(null);
    router.replace('/patient-register' as never);
  };

  const handleSelectPatient = (p: PatientListItem) => {
    setSelectedPatient(p);
    setPatientError(null);
    setSearchTerm('');
    setDebouncedTerm('');
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);

    if (!selectedPatient) {
      setPatientError('Search and select a patient first');
      return;
    }

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

    const doctor = doctorOptions.find((d) => d.value === values.doctorId);
    const doctorName = doctor
      ? doctor.label.replace(/^Dr\.\s*/, '')
      : prefill?.doctorName ?? '';

    const payload: CreateAppointmentRequest = {
      // Fresh UUID per submission so the backend takes the "first time
      // encounter" branch instead of the update branch (which silently
      // overwrites the first row with a NULL encounter_id).
      eventId: generateEventId(),
      name: selectedPatient.name,
      family: selectedPatient.family ?? '',
      dob: normalizeDob(selectedPatient.dob ?? ''),
      // Send phone EXACTLY as the backend stores it — /register-patient
      // prepends a `+`, so /search-patient returns "+9615566787" and the
      // /encounter patient lookup compares against the stored "+9615566787".
      // Stripping the `+` here would cause the lookup to fail and the user
      // gets a misleading "patient not registered" error.
      phone: ensureLeadingPlus(selectedPatient.phone ?? ''),
      date: dateIso,
      start_iso: startIso,
      end_iso: endIso,
      proc: values.notes.trim(),
      resourceId: values.doctorId,
      doctor_name: doctorName,
      booking_reminder: values.bookingReminder,
    };

    // Diagnostic — surfaces the exact payload + response in Metro logs so
    // we can compare the mobile request to what the web app sends.
     
    console.log('[appointment-new] POST /encounter payload:', JSON.stringify(payload, null, 2));

    try {
      const res = await createAppointment.mutateAsync(payload);
       
      console.log('[appointment-new] /encounter response:', JSON.stringify(res, null, 2));
      if (res.status === 'success') {
        setSuccessOpen(true);
      } else if (res.status === 'unavailable') {
        setServerError(
          res.message?.toLowerCase().includes('patient not registered')
            ? 'This patient is not registered. Open Register Patient first.'
            : res.message || 'This time slot is unavailable.',
        );
      } else {
        setServerError(res.message || 'Could not book appointment.');
      }
    } catch (err) {
       
      console.log('[appointment-new] /encounter ERROR:', err);
      const message = err instanceof Error ? err.message : 'Could not book appointment.';
      setServerError(message);
    }
  };

  const fullName = selectedPatient
    ? `${selectedPatient.name} ${selectedPatient.family ?? ''}`.trim()
    : '';
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
          <Text style={styles.title}>New appointment</Text>
          <Text style={styles.subtitle}>
            {fullName || 'Search a patient, then pick a time'}
          </Text>
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
          {selectedPatient ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change selected patient"
              onPress={() => setSelectedPatient(null)}
              style={({ pressed }) => [styles.swapBadge, pressed && styles.pressed]}>
              <Ionicons name="swap-horizontal" size={ms(14)} color={colors.primary[500]} />
              <Text style={styles.swapBadgeText}>Change</Text>
            </Pressable>
          ) : null}
        </View>
        {selectedPatient ? (
          <>
            <View style={styles.row}>
              <ReadOnlyField label="Name" value={selectedPatient.name} style={styles.flex} />
              <ReadOnlyField
                label="Family"
                value={selectedPatient.family || '—'}
                style={styles.flex}
              />
            </View>
            <ReadOnlyField
              label="Date of birth"
              value={formatDobDisplay(selectedPatient.dob || '') || '—'}
            />
          </>
        ) : (
          <View style={styles.patientEmpty}>
            <Ionicons name="person-add-outline" size={ms(20)} color={SUBTITLE_COLOR} />
            <Text style={styles.patientEmptyText}>
              Search above to pick the patient for this appointment.
            </Text>
          </View>
        )}
        {patientError ? <Text style={styles.fieldError}>{patientError}</Text> : null}
      </View>

      <View style={styles.formBlock}>
        <Text style={styles.sectionLabel}>Schedule</Text>

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
          name="doctorId"
          render={({ field, fieldState }) => (
            <Select<number>
              label="Doctor *"
              placeholder="Pick a doctor"
              value={field.value || null}
              options={doctorOptions}
              onChange={(v) => field.onChange(v)}
              error={fieldState.error?.message}
              loading={doctorsLoading}
              emptyMessage={
                doctorsError
                  ? 'Could not load doctors. Please retry.'
                  : 'No doctors mapped to clinics yet. Open Admin → Map Clinics on the web.'
              }
            />
          )}
        />

        <Controller
          control={control}
          name="notes"
          render={({ field, fieldState }) => (
            <TextInput
              label="Notes"
              placeholder="Procedure or visit notes"
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

        <Controller
          control={control}
          name="bookingReminder"
          render={({ field }) => (
            <View style={styles.reminderRow}>
              <Checkbox
                value={field.value}
                onChange={field.onChange}
                label="Send WhatsApp confirmation to patient"
              />
            </View>
          )}
        />
      </View>

      {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

      <View style={styles.actions}>
        <Button
          label="Cancel"
          variant="secondary"
          onPress={goBack}
          fullWidth={false}
          style={styles.flex}
        />
        <Button
          label="Book appointment"
          loading={formState.isSubmitting || createAppointment.isPending}
          onPress={handleSubmit(onSubmit)}
          fullWidth={false}
          style={styles.flex}
        />
      </View>

      <ConfirmDialog
        visible={successOpen}
        variant="success"
        title="Appointment Booked"
        message={`${fullName || 'The appointment'} is on the calendar. Time and doctor are saved.`}
        confirmLabel="Done"
        onConfirm={() => {
          setSuccessOpen(false);
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

function ddMmYyyyToIso(value: string): string | null {
  const m = value.match(DATE_REGEX);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

// Match the web app's dayjs(...).format() output — ISO 8601 with the local
// timezone offset (e.g. "2026-06-22T14:00:00+03:00"). The /encounter handler
// uses dateutil.parser.isoparse which accepts both naive and tz-aware, but
// some downstream WhatsApp template parameters are derived from the parsed
// datetime, so matching the web payload exactly removes one source of drift.
function combineDateAndTime(yyyymmdd: string, hhmm: string): string | null {
  const m = hhmm.match(TIME_REGEX);
  if (!m) return null;
  const [, hh, mm] = m;
  const dt = new Date(`${yyyymmdd}T${hh}:${mm}:00`);
  if (isNaN(dt.getTime())) return null;
  const offsetMin = -dt.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const offsetH = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, '0');
  const offsetM = String(Math.abs(offsetMin) % 60).padStart(2, '0');
  return `${yyyymmdd}T${hh}:${mm}:00${sign}${offsetH}:${offsetM}`;
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

// Backend stores DOB as "DD-Month-YYYY" (e.g. "14-August-1990") but the
// /encounter handler expects YYYY-MM-DD. Translate either format back.
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

function formatDobDisplay(dob: string): string {
  if (!dob) return '';
  const iso = normalizeDob(dob);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [yyyy, mm, dd] = iso.split('-');
    return `${dd}-${mm}-${yyyy}`;
  }
  return dob;
}

function ensureLeadingPlus(phone: string): string {
  const trimmed = (phone ?? '').trim();
  if (!trimmed) return '';
  return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
}

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
  patientEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border.default,
    backgroundColor: colors.background.surface,
  },
  patientEmptyText: {
    ...typography.body.medium,
    color: SUBTITLE_COLOR,
    flex: 1,
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
    paddingVertical: spacing.xs,
  },
  fieldError: {
    ...typography.body.small,
    color: colors.danger[500],
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
