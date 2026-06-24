import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { CountryPicker } from '@/components/country-picker';
import { DateField } from '@/components/date-field';
import { Screen } from '@/components/screen';
import { Select, type SelectOption } from '@/components/select';
import { TextInput } from '@/components/text-input';
import { useDoctors } from '@/hooks/use-doctors';
import { useGenders } from '@/hooks/use-genders';
import { useRegisterPatient } from '@/hooks/use-register-patient';
import { DEFAULT_COUNTRY, type Country } from '@/lib/countries';
import { ms, s } from '@/lib/responsive';
import { useAuthStore } from '@/store/auth';
import { colors, spacing, typography } from '@/theme';
import type { RegisterPatientRequest, RegisterPatientResponse } from '@/types/patients';

const HEADING_COLOR = '#1A202C';
const SUBTITLE_COLOR = '#64748B';

const DOB_REGEX = /^(\d{2})-(\d{2})-(\d{4})$/;
const DIGITS_ONLY = /^[0-9]+$/;

// Per design: Name, Family, Phone, Clinician are required; rest is optional.
const schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  family: z.string().trim().min(1, 'Family name is required'),
  dob: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || DOB_REGEX.test(v), 'Use format DD-MM-YYYY')
    .refine((v) => {
      if (!v) return true;
      const match = v.match(DOB_REGEX);
      if (!match) return false;
      const [, dd, mm, yyyy] = match;
      const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
      return (
        !isNaN(d.getTime()) &&
        d.getDate() === Number(dd) &&
        d.getMonth() + 1 === Number(mm) &&
        d.getFullYear() === Number(yyyy) &&
        d.getTime() < Date.now()
      );
    }, 'Enter a real past date'),
  phone: z
    .string()
    .trim()
    .min(6, 'Phone is required')
    .regex(DIGITS_ONLY, 'Digits only, no spaces or symbols'),
  gender: z.string().trim().optional(),
  doctor: z.number().int().positive('Clinician is required'),
  allergy: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

function dobToBackend(input: string): string {
  const m = input.match(DOB_REGEX);
  if (!m) return input;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

export default function PatientRegisterScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: doctors, isLoading: doctorsLoading, isError: doctorsError } = useDoctors();
  const { data: genders, isLoading: gendersLoading, isError: gendersError } = useGenders();
  const registerPatient = useRegisterPatient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [savedName, setSavedName] = useState<string>('');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);

  const isNonOwnerDoctor = user?.role === 'DOCTOR' && !user.is_owner;
  const lockedDoctorId = isNonOwnerDoctor ? user?.user_id ?? null : null;

  const defaultValues = useMemo<FormValues>(
    () => ({
      name: '',
      family: '',
      dob: '',
      phone: '',
      gender: '',
      doctor: lockedDoctorId ?? 0,
      allergy: '',
    }),
    [lockedDoctorId],
  );

  const { control, handleSubmit, reset, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onTouched',
  });

  // Single-doctor clinic: skip the Select entirely and lock the field to
  // the only available doctor. We still need the form value populated so
  // submit() ships the correct doctor id — auto-set it the moment the
  // doctor list finishes loading.
  const onlyDoctor = !doctorsLoading && (doctors?.length ?? 0) === 1 ? doctors![0] : null;
  useEffect(() => {
    if (onlyDoctor && !lockedDoctorId) {
      setValue('doctor', onlyDoctor.id, { shouldValidate: true });
    }
  }, [onlyDoctor, lockedDoctorId, setValue]);

  const doctorOptions: SelectOption<number>[] = useMemo(
    () =>
      (doctors ?? []).map((d) => ({
        value: d.id,
        label: `Dr. ${[d.name, d.family].filter(Boolean).join(' ').trim()}`,
      })),
    [doctors],
  );

  const genderOptions: SelectOption<string>[] = useMemo(
    () => (genders ?? []).map((g) => ({ value: g.gen, label: g.gen })),
    [genders],
  );

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/register');
    }
  };

  const submit = async (values: FormValues, force = false) => {
    setServerError(null);

    const localPhone = values.phone.trim();
    const payload: RegisterPatientRequest = {
      name: values.name.trim(),
      family: values.family.trim(),
      dob: values.dob?.trim() ? dobToBackend(values.dob.trim()) : undefined,
      phone: `${country.dial}${localPhone}`,
      gender: values.gender || undefined,
      doctor: values.doctor,
      allergy: values.allergy?.trim() || undefined,
      ...(force ? { force_create: true } : {}),
    };

    try {
      const result: RegisterPatientResponse = await registerPatient.mutateAsync(payload);
      handleResult(result, values);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Try again.';
      setServerError(message);
    }
  };

  const handleResult = (result: RegisterPatientResponse, values: FormValues) => {
    if (result.status === 200) {
      const fullName = `${values.name.trim()} ${(values.family ?? '').trim()}`.trim();
      setSavedName(fullName || 'The patient');
      reset(defaultValues);
      setSuccessOpen(true);
      return;
    }
    if (result.status === 'duplicate') {
      const existing = result.existing_patient
        ? `${result.existing_patient.name} ${result.existing_patient.family}`.trim()
        : 'an existing patient';
      Alert.alert(
        'Phone number already used',
        `This phone is already registered to ${existing}. Continue anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', style: 'destructive', onPress: () => submit(values, true) },
        ],
      );
      return;
    }
    setServerError(result.message || 'Could not register patient.');
  };

  const onSubmit = (values: FormValues) => submit(values, false);

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
          <Text style={styles.title}>New Registration</Text>
          <Text style={styles.subtitle}>Register and onboard a new patient into the system.</Text>
        </View>
      </View>

      <View style={styles.formBlock}>
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <TextInput
              label="Name"
              placeholder="Enter your name"
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
              label="Gender (Optional)"
              placeholder=""
              value={field.value || null}
              options={genderOptions}
              onChange={(v) => field.onChange(v ?? '')}
              error={fieldState.error?.message}
              loading={gendersLoading}
              emptyMessage={
                gendersError
                  ? 'Could not load genders. Please retry.'
                  : 'No genders configured yet'
              }
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

        {isNonOwnerDoctor ? (
          <View>
            <Text style={styles.fieldLabel}>Clinician</Text>
            <View style={styles.lockedField}>
              <Text style={styles.lockedFieldText} numberOfLines={1}>
                {`Dr. ${user?.user_name ?? ''}`.trim() || 'You'}
              </Text>
            </View>
            <Text style={styles.helperText}>You can only register patients under your own name.</Text>
          </View>
        ) : onlyDoctor ? (
          <View>
            <Text style={styles.fieldLabel}>Clinician</Text>
            <View style={styles.lockedField}>
              <Text style={styles.lockedFieldText} numberOfLines={1}>
                {`Dr. ${[onlyDoctor.name, onlyDoctor.family].filter(Boolean).join(' ').trim()}`}
              </Text>
            </View>
          </View>
        ) : (
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
                loading={doctorsLoading}
                emptyMessage={
                  doctorsError
                    ? 'Could not load clinicians. Please retry.'
                    : 'No clinicians in this clinic'
                }
              />
            )}
          />
        )}
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
          accessibilityLabel="Register"
          disabled={formState.isSubmitting || registerPatient.isPending}
          onPress={handleSubmit(onSubmit)}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.registerBtn,
            pressed && styles.pressed,
            (formState.isSubmitting || registerPatient.isPending) && styles.disabled,
          ]}>
          <Text style={styles.registerLabel}>
            {formState.isSubmitting || registerPatient.isPending ? 'Saving…' : 'Register'}
          </Text>
        </Pressable>
      </View>

      <ConfirmDialog
        visible={successOpen}
        variant="success"
        title="Patient Registered"
        message={`${savedName} has been added to the patient list.`}
        confirmLabel="Done"
        onConfirm={() => {
          setSuccessOpen(false);
          goBack();
        }}
      />
    </Screen>
  );
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
  lockedField: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: s(12),
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.surface,
  },
  lockedFieldText: {
    ...typography.body.large,
    color: HEADING_COLOR,
  },
  helperText: {
    ...typography.body.small,
    color: SUBTITLE_COLOR,
    marginTop: spacing.xs,
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
