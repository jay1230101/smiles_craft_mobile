import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Screen } from '@/components/screen';
import { ms, s } from '@/lib/responsive';
import { useAuthStore } from '@/store/auth';
import { colors, radius, spacing, typography } from '@/theme';
import type { Role } from '@/types/auth';

const HERO_BANNER = colors.primary[500];
const HERO_BANNER_SOFT = '#EFF6FF';
const TEXT_PRIMARY = '#1A202C';
const TEXT_SECONDARY = '#64748B';
const SUPPORT_EMAIL = 'support@smilescraft.com';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const appVersion = (Constants.expoConfig as { version?: string } | null)?.version ?? '1.0.0';
  const androidBuild = (Constants.expoConfig as { android?: { versionCode?: number } } | null)
    ?.android?.versionCode;
  const iosBuild = (Constants.expoConfig as { ios?: { buildNumber?: string } } | null)
    ?.ios?.buildNumber;
  const build = androidBuild ?? iosBuild;
  // Show just the semantic version on its own when no native build number is
  // available (e.g. running in Expo Go) — the old "1.0.0 (—)" rendering
  // looked like the value failed to load.
  const versionLabel = build ? `v${appVersion} · Build ${build}` : `v${appVersion}`;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/(home)' as never);
  };

  const role = prettyRole(user?.role, user?.is_owner);
  const roleIcon = iconForRole(user?.role);

  const openSupportMail = async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=Smile%20Craft%20Mobile%20Support`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      Alert.alert('Contact support', `Email us at ${SUPPORT_EMAIL}`);
    }
  };

  const openWebApp = async () => {
    const url = 'https://www.smilescraft.com';
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) Linking.openURL(url);
  };

  return (
    <Screen contentContainerStyle={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={goBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={s(20)} color={TEXT_PRIMARY} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroBanner} />
        <View style={styles.heroBody}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsOf(user?.user_name)}</Text>
            </View>
            <View style={styles.statusDot} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroName} numberOfLines={1}>
              {displayName(user?.user_name, user?.role)}
            </Text>
            <View style={styles.roleChip}>
              <Ionicons name={roleIcon} size={ms(12)} color={HERO_BANNER} />
              <Text style={styles.roleChipText}>{role}</Text>
            </View>
            {user?.email ? (
              <Text style={styles.heroEmail} numberOfLines={1}>
                {user.email}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIconCircle, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="shield-checkmark-outline" size={ms(16)} color="#16A34A" />
          </View>
          <View style={styles.statText}>
            <Text style={styles.statLabel}>Session</Text>
            <Text style={styles.statValue}>Active</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconCircle, { backgroundColor: HERO_BANNER_SOFT }]}>
            <Ionicons name="business-outline" size={ms(16)} color={HERO_BANNER} />
          </View>
          <View style={styles.statText}>
            <Text style={styles.statLabel}>Clinic</Text>
            <Text style={styles.statValue}>#{user?.clinic_id ?? '—'}</Text>
          </View>
        </View>
      </View>

      <SectionTitle>Account</SectionTitle>
      <View style={styles.groupCard}>
        <DetailRow icon="mail-outline" label="Email" value={user?.email ?? '—'} />
        <Divider />
        <DetailRow icon="person-outline" label="Role" value={role} />
        {user?.specialty ? (
          <>
            <Divider />
            <DetailRow icon="medkit-outline" label="Specialty" value={user.specialty} />
          </>
        ) : null}
        {user?.is_owner ? (
          <>
            <Divider />
            <DetailRow
              icon="ribbon-outline"
              label="Ownership"
              value="Clinic Owner"
              valueAccent
            />
          </>
        ) : null}
      </View>

      <SectionTitle>Help & Support</SectionTitle>
      <View style={styles.groupCard}>
        <ActionRow
          icon="chatbubbles-outline"
          label="Contact support"
          helper={SUPPORT_EMAIL}
          onPress={openSupportMail}
        />
        <Divider />
        <ActionRow
          icon="globe-outline"
          label="Visit web app"
          helper="smilescraft.com"
          onPress={openWebApp}
        />
      </View>

      <SectionTitle>About</SectionTitle>
      <View style={styles.groupCard}>
        <DetailRow icon="information-circle-outline" label="Version" value={versionLabel} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        onPress={() => setLogoutOpen(true)}
        style={({ pressed }) => [styles.signOutBtn, pressed && styles.signOutPressed]}>
        <Ionicons name="log-out-outline" size={ms(18)} color={colors.danger[500]} />
        <Text style={styles.signOutLabel}>Sign out</Text>
      </Pressable>

      <ConfirmDialog
        visible={logoutOpen}
        variant="danger"
        title="Sign out?"
        message="You'll need to sign in again to access your account."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        onConfirm={() => {
          setLogoutOpen(false);
          logout();
        }}
        onCancel={() => setLogoutOpen(false)}
      />
    </Screen>
  );
}

function DetailRow({
  icon,
  label,
  value,
  valueAccent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueAccent?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon} size={ms(18)} color={TEXT_SECONDARY} />
      </View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[styles.detailValue, valueAccent && styles.detailValueAccent]}
        numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  helper,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  helper?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}>
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon} size={ms(18)} color={HERO_BANNER} />
      </View>
      <View style={styles.actionText}>
        <Text style={styles.actionLabel}>{label}</Text>
        {helper ? <Text style={styles.actionHelper}>{helper}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={ms(18)} color={TEXT_SECONDARY} />
    </Pressable>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function initialsOf(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function displayName(name?: string, role?: Role): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return 'Account';
  if (role === 'DOCTOR' && !/^Dr\.\s/i.test(trimmed)) return `Dr. ${trimmed}`;
  return trimmed;
}

function prettyRole(role?: Role, isOwner?: boolean): string {
  if (!role) return 'Account';
  if (role === 'DOCTOR') return isOwner ? 'Owner Doctor' : 'Doctor';
  if (role === 'SYSTEMADMIN') return 'System Admin';
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function iconForRole(role?: Role): keyof typeof Ionicons.glyphMap {
  switch (role) {
    case 'DOCTOR':
      return 'medkit-outline';
    case 'ASSISTANT':
      return 'people-outline';
    case 'NURSE':
      return 'heart-outline';
    case 'ADMIN':
    case 'SYSTEMADMIN':
      return 'shield-outline';
    default:
      return 'person-outline';
  }
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    ...typography.title.large,
    fontFamily: 'Inter_700Bold',
    fontSize: ms(20),
    color: TEXT_PRIMARY,
  },
  headerSpacer: {
    width: s(40),
  },
  heroCard: {
    borderRadius: s(20),
    backgroundColor: colors.background.base,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  heroBanner: {
    height: s(72),
    backgroundColor: HERO_BANNER,
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    marginTop: -s(36),
  },
  avatarRing: {
    width: s(80),
    height: s(80),
    borderRadius: s(40),
    backgroundColor: colors.background.base,
    alignItems: 'center',
    justifyContent: 'center',
    padding: s(4),
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  avatar: {
    width: s(72),
    height: s(72),
    borderRadius: s(36),
    backgroundColor: HERO_BANNER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    fontSize: ms(26),
    letterSpacing: 0.5,
  },
  statusDot: {
    position: 'absolute',
    bottom: s(4),
    right: s(4),
    width: s(16),
    height: s(16),
    borderRadius: s(8),
    backgroundColor: '#16A34A',
    borderWidth: 2,
    borderColor: colors.background.base,
  },
  heroText: {
    flex: 1,
    gap: spacing.xs,
    paddingTop: s(40),
  },
  heroName: {
    ...typography.title.large,
    fontFamily: 'Inter_700Bold',
    fontSize: ms(18),
    color: TEXT_PRIMARY,
  },
  roleChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: HERO_BANNER_SOFT,
  },
  roleChipText: {
    ...typography.label.small,
    fontFamily: 'Inter_600SemiBold',
    fontSize: ms(11),
    color: HERO_BANNER,
    letterSpacing: 0.3,
  },
  heroEmail: {
    ...typography.body.small,
    color: TEXT_SECONDARY,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: s(14),
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.base,
  },
  statIconCircle: {
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: {
    flex: 1,
    gap: 2,
  },
  statLabel: {
    ...typography.body.small,
    color: TEXT_SECONDARY,
  },
  statValue: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    fontSize: ms(14),
    color: TEXT_PRIMARY,
  },
  sectionTitle: {
    ...typography.label.small,
    fontFamily: 'Inter_600SemiBold',
    fontSize: ms(11),
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.sm,
    marginBottom: -spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  groupCard: {
    borderRadius: s(14),
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.base,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  detailIconWrap: {
    width: s(28),
    alignItems: 'center',
  },
  detailLabel: {
    flex: 1,
    ...typography.body.medium,
    color: TEXT_SECONDARY,
  },
  detailValue: {
    ...typography.body.medium,
    fontFamily: 'Inter_600SemiBold',
    color: TEXT_PRIMARY,
    maxWidth: '55%',
    textAlign: 'right',
  },
  detailValueAccent: {
    color: HERO_BANNER,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  actionRowPressed: {
    backgroundColor: HERO_BANNER_SOFT,
  },
  actionText: {
    flex: 1,
    gap: 2,
  },
  actionLabel: {
    ...typography.body.medium,
    fontFamily: 'Inter_600SemiBold',
    color: TEXT_PRIMARY,
  },
  actionHelper: {
    ...typography.body.small,
    color: TEXT_SECONDARY,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginLeft: s(28) + spacing.md + spacing.lg,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: s(52),
    borderRadius: s(14),
    borderWidth: 1,
    borderColor: colors.danger[500],
    backgroundColor: colors.background.base,
    marginTop: spacing.sm,
  },
  signOutPressed: {
    backgroundColor: '#FEF2F2',
  },
  signOutLabel: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    color: colors.danger[500],
    fontSize: ms(15),
  },
});
