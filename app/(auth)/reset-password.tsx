import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextInput } from '@/components/text-input';
import { colors, spacing, typography } from '@/theme';

const passwordRules = [
  '8+ characters',
  'One uppercase',
  'One lowercase',
  'One number',
  'One special character',
];

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Use at least 8 characters')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/[a-z]/, 'Include a lowercase letter')
      .regex(/[0-9]/, 'Include a number')
      .regex(/[^A-Za-z0-9]/, 'Include a special character'),
    confirm: z.string().min(1, 'Confirm your password'),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

type ResetForm = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
    mode: 'onTouched',
  });

  const onSubmit = async (_values: ResetForm) => {
    setServerError(null);
    setSubmitting(true);
    try {
      router.replace('/(auth)/reset-success');
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Could not update password';
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.container}>
      <View style={styles.headerBlock}>
        <BackButton />
        <View style={styles.titleGroup}>
          <Text style={styles.title}>Create New Password</Text>
          <Text style={styles.subtitle}>Please enter your new password below.</Text>
        </View>
      </View>

      <View style={styles.formBlock}>
        <Controller
          control={control}
          name="password"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              label="New Password"
              placeholder="Enter your password"
              secure
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
              returnKeyType="next"
            />
          )}
        />

        <Controller
          control={control}
          name="confirm"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              label="Confirm Password"
              placeholder="Re-enter your password"
              secure
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.confirm?.message}
              returnKeyType="done"
              onSubmitEditing={handleSubmit(onSubmit)}
            />
          )}
        />
      </View>

      <View style={styles.rulesBlock}>
        <Text style={styles.rulesTitle}>Must contain at least</Text>
        {passwordRules.map((rule) => (
          <Text key={rule} style={styles.ruleItem}>
            {`• ${rule}`}
          </Text>
        ))}
      </View>

      {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

      <View style={styles.submitWrap}>
        <Button label="Update Password" loading={submitting} onPress={handleSubmit(onSubmit)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.lg,
  },
  headerBlock: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  titleGroup: {
    gap: spacing.sm,
  },
  title: {
    ...typography.title.large,
    fontFamily: 'Inter_600SemiBold',
    color: colors.neutral[500],
  },
  subtitle: {
    ...typography.title.medium,
    fontFamily: 'Inter_400Regular',
    color: colors.text.secondary,
  },
  formBlock: {
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  rulesBlock: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  rulesTitle: {
    ...typography.label.large,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  ruleItem: {
    ...typography.body.medium,
    color: colors.text.secondary,
  },
  serverError: {
    ...typography.body.medium,
    color: colors.danger[500],
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  submitWrap: {
    marginTop: spacing.md,
  },
});
