import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { s } from '@/lib/responsive';
import { useAuthStore } from '@/store/auth';
import { colors, radius, spacing, typography } from '@/theme';
import type { Role } from '@/types/auth';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const appVersion = (Constants.expoConfig as { version?: string } | null)?.version ?? '1.0.0';
  const buildNumber =
    (Constants.expoConfig as { android?: { versionCode?: number } } | null)?.android?.versionCode ?? '—';

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/(home)' as never);
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <Screen contentContainerStyle={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={goBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={s(22)} color={colors.neutral[500]} />
        </Pressable>
        <Text style={styles.title}>Profile & Settings</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(user?.user_name)}</Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.name} numberOfLines={1}>
            {user?.user_name || 'Account'}
          </Text>
          <Text style={styles.role}>{prettyRole(user?.role, user?.is_owner)}</Text>
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
        </View>
      </View>

      <SectionTitle>Preferences</SectionTitle>
      <SettingsRow
        icon="language-outline"
        label="Language"
        value="English"
        helper="Multi-language support is planned for a later release"
        disabled
      />
      <SettingsRow
        icon="notifications-outline"
        label="Push notifications"
        value="Off"
        helper="Push notifications need a backend update — coming soon"
        disabled
      />

      <SectionTitle>About</SectionTitle>
      <SettingsRow
        icon="information-circle-outline"
        label="App version"
        value={`${appVersion} (${buildNumber})`}
        disabled
      />
      <SettingsRow
        icon="business-outline"
        label="Clinic ID"
        value={user?.clinic_id ? String(user.clinic_id) : '—'}
        disabled
      />

      <View style={styles.logoutBlock}>
        <Button
          label="Log out"
          variant="secondary"
          onPress={handleLogout}
          leftIcon={<Ionicons name="log-out-outline" size={s(18)} color={colors.danger[500]} />}
          style={styles.logoutBtn}
        />
      </View>
    </Screen>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  helper,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  helper?: string;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsRow,
        pressed && !disabled && onPress ? styles.settingsRowPressed : null,
      ]}>
      <View style={styles.settingsIconWrap}>
        <Ionicons name={icon} size={s(20)} color={colors.neutral[500]} />
      </View>
      <View style={styles.settingsText}>
        <Text style={styles.settingsLabel}>{label}</Text>
        {helper ? <Text style={styles.settingsHelper}>{helper}</Text> : null}
      </View>
      {value ? (
        <Text style={styles.settingsValue} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {onPress && !disabled ? (
        <Ionicons name="chevron-forward" size={s(18)} color={colors.text.secondary} />
      ) : null}
    </Pressable>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function initialsOf(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function prettyRole(role?: Role, isOwner?: boolean): string {
  if (!role) return 'Account';
  const base = role.charAt(0) + role.slice(1).toLowerCase();
  if (role === 'DOCTOR') return isOwner ? 'Owner Doctor' : 'Doctor';
  return base;
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backBtn: {
    width: s(40),
    height: s(40),
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.surface,
  },
  pressed: {
    opacity: 0.6,
  },
  title: {
    ...typography.title.large,
    fontFamily: 'Inter_700Bold',
    color: colors.neutral[500],
    flex: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.background.surface,
    borderRadius: radius.lg,
  },
  avatar: {
    width: s(64),
    height: s(64),
    borderRadius: radius.pill,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.text.inverse,
    fontFamily: 'Inter_700Bold',
    fontSize: s(22),
  },
  profileText: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.title.medium,
    fontFamily: 'Inter_600SemiBold',
    color: colors.neutral[500],
  },
  role: {
    ...typography.body.medium,
    color: colors.primary[500],
    fontFamily: 'Inter_500Medium',
  },
  email: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  sectionTitle: {
    ...typography.label.medium,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: -spacing.xs,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background.base,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  settingsRowPressed: {
    opacity: 0.7,
  },
  settingsIconWrap: {
    width: s(36),
    height: s(36),
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.surface,
  },
  settingsText: {
    flex: 1,
    gap: 2,
  },
  settingsLabel: {
    ...typography.body.large,
    fontFamily: 'Inter_500Medium',
    color: colors.neutral[500],
  },
  settingsHelper: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  settingsValue: {
    ...typography.body.medium,
    color: colors.text.secondary,
    maxWidth: '40%',
    textAlign: 'right',
  },
  logoutBlock: {
    marginTop: spacing.lg,
  },
  logoutBtn: {
    borderColor: colors.danger[500],
  },
});
