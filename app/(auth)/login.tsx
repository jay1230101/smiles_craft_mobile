import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { LinkText } from '@/components/link-text';
import { Screen } from '@/components/screen';
import { TextInput } from '@/components/text-input';
import { useAuthStore } from '@/store/auth';
import { colors, spacing, typography } from '@/theme';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof schema>;

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const isSubmitting = useAuthStore((s) => s.isSubmitting);
  const [remember, setRemember] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  const onSubmit = async (values: LoginForm) => {
    setSubmitError(null);
    try {
      await login(values.email.trim().toLowerCase(), values.password);
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Login failed';
      setSubmitError(message);
    }
  };

  return (
    <Screen contentContainerStyle={styles.container}>
      <View style={styles.logoWrap}>
        <BrandLogo size="medium" />
      </View>

      <View style={styles.headerBlock}>
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Sign in to continue to Smile Craft</Text>
      </View>

      <View style={styles.formBlock}>
        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              label="Email"
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
              returnKeyType="next"
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              label="Password"
              placeholder="Enter your password"
              secure
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
              returnKeyType="done"
              onSubmitEditing={handleSubmit(onSubmit)}
            />
          )}
        />
      </View>

      <View style={styles.optionsRow}>
        <Checkbox value={remember} onChange={setRemember} label="Remember me" />
        <LinkText label="Forgot Password?" onPress={() => router.push('/(auth)/forgot-password')} />
      </View>

      {submitError ? <Text style={styles.serverError}>{submitError}</Text> : null}

      <View style={styles.submitWrap}>
        <Button label="Login" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xxl,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  headerBlock: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
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
    marginBottom: spacing.md,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  serverError: {
    ...typography.body.medium,
    color: colors.danger[500],
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  submitWrap: {
    marginTop: spacing.xxl,
  },
});
