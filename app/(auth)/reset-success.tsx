import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { colors, radius, spacing, typography } from '@/theme';

export default function ResetSuccessScreen() {
  const router = useRouter();

  return (
    <Screen contentContainerStyle={styles.container}>
      <View style={styles.contentBlock}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={64} color={colors.primary[500]} />
        </View>
        <Text style={styles.title}>Password Successfully Updated!</Text>
        <Text style={styles.subtitle}>
          Your password has been changed successfully. You can now log in using your new password.
        </Text>
      </View>

      <View style={styles.submitWrap}>
        <Button label="Back to Login" onPress={() => router.replace('/(auth)/login')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xxxl,
  },
  contentBlock: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxxl,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.primary[0],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.title.large,
    fontFamily: 'Inter_600SemiBold',
    color: colors.neutral[500],
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body.large,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  submitWrap: {
    marginTop: 'auto',
  },
});
