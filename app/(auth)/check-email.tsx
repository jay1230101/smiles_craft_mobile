import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { LinkText } from '@/components/link-text';
import { Screen } from '@/components/screen';
import { forgotPasswordRequest } from '@/api/auth';
import { colors, spacing, typography } from '@/theme';
import { useState } from 'react';

export default function CheckEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email ?? '';
  const [resending, setResending] = useState(false);

  const handleOpenEmail = async () => {
    try {
      await Linking.openURL('mailto:');
    } catch {}
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await forgotPasswordRequest(email);
    } catch {} finally {
      setResending(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.container}>
      <View style={styles.headerBlock}>
        <BackButton onPress={() => router.back()} />
        <View style={styles.titleGroup}>
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.subtitle}>
            We’ve sent a password reset link to{' '}
            <Text style={styles.emailHighlight}>{email || 'your inbox'}</Text>
          </Text>
        </View>
      </View>

      <View style={styles.spacer} />

      <View style={styles.submitWrap}>
        <Button label="Open Email" onPress={handleOpenEmail} />
        <View style={styles.helperRow}>
          <Text style={styles.helperText}>Didn’t receive the email? </Text>
          <LinkText label="Resend Link" onPress={handleResend} disabled={resending} />
        </View>
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
  emailHighlight: {
    color: colors.text.primary,
    fontFamily: 'Inter_500Medium',
  },
  spacer: {
    flex: 1,
  },
  submitWrap: {
    gap: spacing.lg,
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
