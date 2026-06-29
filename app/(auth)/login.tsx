import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { LinkText } from '@/components/link-text';
import { Screen } from '@/components/screen';
import { TextInput } from '@/components/text-input';
import { rememberedEmailStorage } from '@/api/storage';
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
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  // Hydrate the remembered email on mount. If we find one, prefill the email
  // field and pre-check the "Remember me" box so the user sees their choice
  // restored. Only the email is persisted — never the password.
  useEffect(() => {
    let alive = true;
    (async () => {
      const saved = await rememberedEmailStorage.get();
      if (alive && saved) {
        setValue('email', saved);
        setRemember(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [setValue]);

  const onSubmit = async (values: LoginForm) => {
    const email = values.email.trim().toLowerCase();
    try {
      await login(email, values.password);
      // Persist (or clear) the email based on the checkbox after a
      // successful login so the wrong-credentials path doesn't trigger it.
      if (remember) {
        await rememberedEmailStorage.set(email);
      } else {
        await rememberedEmailStorage.clear();
      }
    } catch (err) {
      const raw =
        err && typeof err === 'object' && 'message' in err ? String(err.message) : '';
      // Normalize backend messages — anything 401/credentials-related becomes
      // the friendly "Incorrect email or password" copy; everything else
      // surfaces verbatim so the user gets useful detail (e.g. network down).
      const looksLikeCredentialError =
        !raw ||
        /invalid|incorrect|wrong|unauthor|password|credential|not found/i.test(raw);
      setErrorMessage(
        looksLikeCredentialError
          ? 'The email or password you entered is incorrect. Please try again.'
          : raw,
      );
      setErrorOpen(true);
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

      <View style={styles.submitWrap}>
        <Button label="Login" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      </View>

      <ConfirmDialog
        visible={errorOpen}
        variant="danger"
        title="Sign-in failed"
        message={errorMessage}
        confirmLabel="Try again"
        onConfirm={() => setErrorOpen(false)}
      />
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
    marginBottom: spacing.huge,
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
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  submitWrap: {
    marginTop: spacing.huge,
  },
});
