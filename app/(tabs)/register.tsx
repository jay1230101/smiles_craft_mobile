import { zodResolver } from '@hookform/resolvers/zod';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Select, type SelectOption } from '@/components/select';
import { TextInput } from '@/components/text-input';
import { useDoctors } from '@/hooks/use-doctors';
import { useGenders } from '@/hooks/use-genders';
import { useRegisterPatient } from '@/hooks/use-register-patient';
import { useAuthStore } from '@/store/auth';
import { colors, spacing, typography } from '@/theme';
import type { RegisterPatientRequest, RegisterPatientResponse } from '@/types/patients';

// Form-facing DOB format is DD-MM-YYYY (user-friendly); we convert to the
// backend's required YYYY-MM-DD on submit.
const DOB_REGEX = /^(\d{2})-(\d{2})-(\d{4})$/;
const DIGITS_ONLY = /^[0-9]+$/;

const schema = z.object({
  name: z.string().trim().min(1, 'First name is required'),
  family: z.string().trim().min(1, 'Last name is required'),
  father: z.string().trim().optional(),
  dob: z
    .string()
    .trim()
    .regex(DOB_REGEX, 'Use format DD-MM-YYYY')
    .refine((v) => {
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
  gender: z.string().trim().min(1, 'Gender is required'),
  doctor: z.number().int().positive('Doctor is required'),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  allergy: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

function dobToBackend(input: string): string {
  const m = input.match(DOB_REGEX);
  if (!m) return input;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

export default function RegisterScreen() {
  const user = useAuthStore((s) => s.user);
  const bottomTabHeight = useBottomTabBarHeight();
  const safeBottomPadding = Math.max(bottomTabHeight, 80) + spacing.xxl;
  const { data: doctors } = useDoctors();
  const { data: genders } = useGenders();
  const registerPatient = useRegisterPatient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Non-owner doctors register patients for themselves; everyone else picks.
  const isNonOwnerDoctor = user?.role === 'DOCTOR' && !user.is_owner;
  const lockedDoctorId = isNonOwnerDoctor ? user?.user_id ?? null : null;

  const defaultValues = useMemo<FormValues>(
    () => ({
      name: '',
      family: '',
      father: '',
      dob: '',
      phone: '',
      gender: '',
      doctor: lockedDoctorId ?? 0,
      email: '',
      allergy: '',
    }),
    [lockedDoctorId],
  );

  const { control, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onTouched',
  });

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

  const submit = async (values: FormValues, force = false) => {
    setServerError(null);
    setSuccessMessage(null);

    const payload: RegisterPatientRequest = {
      name: values.name.trim(),
      family: values.family.trim(),
      father: values.father?.trim() || undefined,
      dob: dobToBackend(values.dob.trim()),
      phone: values.phone.trim(),
      gender: values.gender,
      doctor: values.doctor,
      email: values.email?.trim() || undefined,
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
      setSuccessMessage('Patient registered successfully.');
      reset(defaultValues);
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
    <Screen
      contentContainerStyle={[styles.container, { paddingBottom: safeBottomPadding }]}
      edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>New Patient</Text>
        <Text style={styles.subtitle}>Register a new patient record for the clinic.</Text>
      </View>

      <View style={styles.formBlock}>
        <View style={styles.row}>
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <TextInput
                containerStyle={styles.flex}
                label="First name *"
                placeholder="First name"
                autoCapitalize="words"
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
                containerStyle={styles.flex}
                label="Last name *"
                placeholder="Last name"
                autoCapitalize="words"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                returnKeyType="next"
              />
            )}
          />
        </View>

        <Controller
          control={control}
          name="father"
          render={({ field, fieldState }) => (
            <TextInput
              label="Father's name"
              placeholder="Optional"
              autoCapitalize="words"
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
            <TextInput
              label="Date of birth *"
              placeholder="DD-MM-YYYY"
              keyboardType="number-pad"
              autoCapitalize="none"
              autoCorrect={false}
              value={field.value}
              onChangeText={(text) => field.onChange(formatDob(text))}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              helperText={!fieldState.error ? 'Example: 14-08-1990' : undefined}
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field, fieldState }) => (
            <TextInput
              label="Phone number *"
              placeholder="9613xxxxxxx"
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              value={field.value}
              onChangeText={(text) => field.onChange(text.replace(/\D/g, ''))}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              helperText={!fieldState.error ? 'Country code first, no + sign.' : undefined}
            />
          )}
        />

        <Controller
          control={control}
          name="gender"
          render={({ field, fieldState }) => (
            <Select<string>
              label="Gender *"
              placeholder="Select gender"
              value={field.value || null}
              options={genderOptions}
              onChange={(v) => field.onChange(v)}
              error={fieldState.error?.message}
            />
          )}
        />

        {isNonOwnerDoctor ? (
          <View>
            <Text style={styles.fieldLabel}>Assigned doctor</Text>
            <View style={styles.lockedField}>
              <Text style={styles.lockedFieldText} numberOfLines={1}>
                {`Dr. ${user?.user_name ?? ''}`.trim() || 'You'}
              </Text>
            </View>
            <Text style={styles.helperText}>You can only register patients under your own name.</Text>
          </View>
        ) : (
          <Controller
            control={control}
            name="doctor"
            render={({ field, fieldState }) => (
              <Select<number>
                label="Assigned doctor *"
                placeholder="Select doctor"
                value={field.value || null}
                options={doctorOptions}
                onChange={(v) => field.onChange(v)}
                error={fieldState.error?.message}
              />
            )}
          />
        )}

        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <TextInput
              label="Email"
              placeholder="Optional"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              value={field.value ?? ''}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="allergy"
          render={({ field, fieldState }) => (
            <TextInput
              label="Allergies / notes"
              placeholder="Optional"
              autoCapitalize="sentences"
              value={field.value ?? ''}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              multiline
              numberOfLines={3}
            />
          )}
        />
      </View>

      {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}
      {successMessage ? <Text style={styles.serverSuccess}>{successMessage}</Text> : null}

      <View style={styles.submitWrap}>
        <Button
          label="Register patient"
          loading={formState.isSubmitting || registerPatient.isPending}
          onPress={handleSubmit(onSubmit)}
        />
      </View>
    </Screen>
  );
}

// Auto-insert dashes as the user types so DD-MM-YYYY is enforced without a
// dedicated date picker. Strip non-digits then re-segment.
function formatDob(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 4));
  if (digits.length > 4) parts.push(digits.slice(4, 8));
  return parts.join('-');
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.xs,
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
  fieldLabel: {
    ...typography.body.medium,
    fontFamily: 'Inter_500Medium',
    color: colors.neutral[500],
    marginBottom: spacing.xs,
  },
  lockedField: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.surface,
  },
  lockedFieldText: {
    ...typography.body.large,
    color: colors.neutral[500],
  },
  helperText: {
    ...typography.body.small,
    color: colors.text.secondary,
    marginTop: spacing.xs,
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
  submitWrap: {
    marginTop: spacing.md,
  },
});
