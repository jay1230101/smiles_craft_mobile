import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { LinkText } from '@/components/link-text';
import { Screen } from '@/components/screen';
import { TextInput } from '@/components/text-input';
import { forgotPasswordRequest } from '@/api/auth';
import { colors, spacing, typography } from '@/theme';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
});

type ForgotForm = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
    mode: 'onTouched',
  });

  const onSubmit = async (values: ForgotForm) => {
    const email = values.email.trim().toLowerCase();
    setServerError(null);
    setSubmitting(true);
    try {
      await forgotPasswordRequest(email);
      router.push({ pathname: '/(auth)/check-email', params: { email } });
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String(err.message)
          : 'Could not send reset email. Please try again.';
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
          <Text style={styles.title}>Forgot Your Password</Text>
          <Text style={styles.subtitle}>
            Enter your registered email address and we’ll send you a password reset link.
          </Text>
        </View>
      </View>

      <View style={styles.formBlock}>
        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              label="Enter your registered email"
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
              returnKeyType="send"
              onSubmitEditing={handleSubmit(onSubmit)}
            />
          )}
        />
      </View>

      {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

      <View style={styles.submitWrap}>
        <Button label="Send Reset Link" loading={submitting} onPress={handleSubmit(onSubmit)} />
        <View style={styles.helperRow}>
          <Text style={styles.helperText}>Didn’t receive the email? </Text>
          <LinkText label="Resend Link" onPress={handleSubmit(onSubmit)} disabled={submitting} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xl,
  },
  headerBlock: {
    gap: spacing.xl,
    marginBottom: spacing.huge,
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
    marginBottom: spacing.huge,
  },
  serverError: {
    ...typography.body.medium,
    color: colors.danger[500],
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  submitWrap: {
    gap: spacing.xl,
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperText: {
    ...typography.body.large,
    color: colors.neutral[400],
  },
});
