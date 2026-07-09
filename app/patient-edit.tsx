import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { CountryPicker } from '@/components/country-picker';
import { DateField } from '@/components/date-field';
import { Screen } from '@/components/screen';
import { Select, type SelectOption } from '@/components/select';
import { TextInput } from '@/components/text-input';
import { useDoctors } from '@/hooks/use-doctors';
import { useGenders } from '@/hooks/use-genders';
import { useUpdatePatient } from '@/hooks/use-update-patient';
import {
  DEFAULT_COUNTRY,
  inferCountryFromPhone,
  stripDialCode,
  type Country,
} from '@/lib/countries';
import { formatDoctorName } from '@/lib/appointments';
import { ms, s } from '@/lib/responsive';
import { dobToBackend, patientSchema, type PatientFormValues } from '@/lib/schemas';
import { useEditPatientStore } from '@/store/edit-patient';
import { colors, spacing, typography } from '@/theme';
import type { PatientListItem, UpdatePatientRequest } from '@/types/patients';

const HEADING_COLOR = '#1A202C';
const SUBTITLE_COLOR = '#64748B';

// Patient form schema + DOB converter shared with patient-register.tsx.
const schema = patientSchema;
type FormValues = PatientFormValues;

export default function PatientEditScreen() {
  const router = useRouter();
  const patient = useEditPatientStore((s) => s.patient);
  const clearPatient = useEditPatientStore((s) => s.clear);

  if (!patient) {
    return <Redirect href="/(tabs)/register" />;
  }

  return <EditForm patient={patient} router={router} clearPatient={clearPatient} />;
}

function EditForm({
  patient,
  router,
  clearPatient,
}: {
  patient: PatientListItem;
  router: ReturnType<typeof useRouter>;
  clearPatient: () => void;
}) {
  const { data: doctors } = useDoctors();
  const { data: genders } = useGenders();
  const updatePatient = useUpdatePatient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  const initialCountry = useMemo<Country>(
    () => inferCountryFromPhone(patient.phone ?? '') ?? DEFAULT_COUNTRY,
    [patient.phone],
  );
  const [country, setCountry] = useState<Country>(initialCountry);

  const initialDefaults = useMemo<FormValues>(
    () => ({
      name: patient.name ?? '',
      family: patient.family ?? '',
      dob: backendDobToForm(patient.dob),
      phone: stripDialCode(patient.phone ?? '', initialCountry),
      gender: patient.gender ?? '',
      doctor: patient.doctor_id ?? 0,
      allergy: patient.allergy ?? '',
    }),
    [patient, initialCountry],
  );

  const { control, handleSubmit, reset, formState } = useForm<FormValues>({
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
        label: formatDoctorName([d.name, d.family].filter(Boolean).join(' ').trim()) || 'Doctor',
      })),
    [doctors],
  );

  const genderOptions: SelectOption<string>[] = useMemo(
    () => (genders ?? []).map((g) => ({ value: g.gen, label: g.gen })),
    [genders],
  );

  const goBack = () => {
    clearPatient();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/register');
    }
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);

    const localPhone = values.phone.trim();
    const payload: UpdatePatientRequest = {
      id: patient.id,
      name: values.name.trim(),
      family: values.family.trim(),
      dob: values.dob?.trim() ? dobToBackend(values.dob.trim()) : undefined,
      phone: `${country.dial}${localPhone}`,
      gender: values.gender || undefined,
      doctor: values.doctor,
      allergy: values.allergy?.trim() || undefined,
    };

    try {
      const res = await updatePatient.mutateAsync(payload);
      if (res.status === 200 || res.status === 'success') {
        setSuccessOpen(true);
      } else {
        setServerError(res.message || 'Could not update patient.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update patient.';
      setServerError(message);
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
          <Text style={styles.title}>Edit Patient</Text>
          <Text style={styles.subtitle}>Edit and update the details of the patients.</Text>
        </View>
      </View>

      <View style={styles.formBlock}>
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <TextInput
              label="Name"
              placeholder="Enter name"
              autoCapitalize="words"
              maxLength={50}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              returnKeyType="next"
            />
          )}
        />

        <Controller
          control={control}
          name="family"
          render={({ field, fieldState }) => (
            <TextInput
              label="Family"
              placeholder="Enter family name"
              autoCapitalize="words"
              maxLength={50}
              value={field.value ?? ''}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              returnKeyType="next"
            />
          )}
        />

        <Controller
          control={control}
          name="dob"
          render={({ field, fieldState }) => (
            <DateField
              label="DOB (Optional)"
              placeholder="Select date of birth"
              value={field.value ?? ''}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field, fieldState }) => (
            <View style={styles.phoneBlock}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <View style={styles.phoneRow}>
                <CountryPicker value={country} onChange={setCountry} />
                <View style={styles.phoneInputWrap}>
                  <TextInput
                    placeholder={`+${country.dial}`}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={50}
                    value={field.value}
                    onChangeText={(text) => field.onChange(text.replace(/\D/g, ''))}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                </View>
              </View>
            </View>
          )}
        />

        <Controller
          control={control}
          name="gender"
          render={({ field, fieldState }) => (
            <Select<string>
              label="Gender"
              placeholder=""
              value={field.value || null}
              options={genderOptions}
              onChange={(v) => field.onChange(v ?? '')}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="allergy"
          render={({ field, fieldState }) => (
            <TextInput
              label="Allergies (Optional)"
              placeholder=""
              autoCapitalize="sentences"
              maxLength={50}
              value={field.value ?? ''}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              multiline
              numberOfLines={2}
            />
          )}
        />

        <Controller
          control={control}
          name="doctor"
          render={({ field, fieldState }) => (
            <Select<number>
              label="Clinician"
              placeholder=""
              value={field.value || null}
              options={doctorOptions}
              onChange={(v) => field.onChange(v)}
              error={fieldState.error?.message}
            />
          )}
        />
      </View>

      {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          onPress={goBack}
          style={({ pressed }) => [styles.actionBtn, styles.cancelBtn, pressed && styles.pressed]}>
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Update"
          disabled={formState.isSubmitting || updatePatient.isPending}
          onPress={handleSubmit(onSubmit)}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.registerBtn,
            pressed && styles.pressed,
            (formState.isSubmitting || updatePatient.isPending) && styles.disabled,
          ]}>
          <Text style={styles.registerLabel}>
            {formState.isSubmitting || updatePatient.isPending ? 'Saving…' : 'Update'}
          </Text>
        </Pressable>
      </View>

      <ConfirmDialog
        visible={successOpen}
        variant="success"
        title="Patient Updated"
        message={`${[patient.name, patient.family].filter(Boolean).join(' ').trim() || 'The patient'}'s details have been saved successfully.`}
        confirmLabel="Done"
        onConfirm={() => {
          setSuccessOpen(false);
          goBack();
        }}
      />
    </Screen>
  );
}

// Backend returns DOB in YYYY-MM-DD; the form wants DD-MM-YYYY.
function backendDobToForm(input?: string): string {
  if (!input) return '';
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  const [, yyyy, mm, dd] = m;
  return `${dd}-${mm}-${yyyy}`;
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
  formBlock: {
    gap: spacing.xl,
  },
  fieldLabel: {
    ...typography.body.medium,
    fontFamily: 'Inter_500Medium',
    color: HEADING_COLOR,
    marginBottom: spacing.xs,
  },
  phoneBlock: {
    gap: spacing.xs,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  countryCode: {
    height: s(48),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: s(12),
    backgroundColor: colors.background.base,
  },
  flag: {
    fontSize: ms(20),
  },
  phoneInputWrap: {
    flex: 1,
  },
  serverError: {
    ...typography.body.medium,
    color: colors.danger[500],
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
    height: s(56),
    borderRadius: s(59),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: colors.background.surface,
  },
  cancelLabel: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
    fontSize: ms(16),
  },
  registerBtn: {
    backgroundColor: colors.primary[500],
  },
  registerLabel: {
    ...typography.label.large,
    fontFamily: 'Inter_500Medium',
    color: '#FFFFFF',
    fontSize: ms(16),
  },
  disabled: {
    opacity: 0.6,
  },
});
