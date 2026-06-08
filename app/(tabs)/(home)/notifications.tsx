import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LinkText } from '@/components/link-text';
import { Screen } from '@/components/screen';
import { DEMO_MODE, getMockNotifications } from '@/lib/mock-appointments';
import { s } from '@/lib/responsive';
import { useNotificationsStore } from '@/store/notifications';
import { colors, radius, spacing, typography } from '@/theme';
import type { NotificationItem, NotificationKind } from '@/types/notifications';

export default function NotificationsScreen() {
  const router = useRouter();
  const items = useNotificationsStore((s) => s.items);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const clear = useNotificationsStore((s) => s.clear);
  const hydrate = useNotificationsStore((s) => s.hydrate);
  const bottomTabHeight = useBottomTabBarHeight();
  const safeBottomPadding = Math.max(bottomTabHeight, 80) + spacing.xxl;

  // In demo mode, seed the store with sample notifications on first open so
  // the screen looks realistic. No-op if the store already has items.
  useEffect(() => {
    if (DEMO_MODE && items.length === 0) {
      hydrate(getMockNotifications());
    }
  }, [hydrate, items.length]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/(home)' as never);
  };

  const hasItems = items.length > 0;
  const hasUnread = items.some((it) => !it.read);

  return (
    <Screen
      contentContainerStyle={[styles.container, { paddingBottom: safeBottomPadding }]}
      edges={['top']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={goBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={s(22)} color={colors.neutral[500]} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
      </View>

      {hasItems ? (
        <View style={styles.actionsRow}>
          <LinkText
            label="Mark all as read"
            onPress={markAllRead}
            disabled={!hasUnread}
          />
          <LinkText label="Clear all" onPress={clear} />
        </View>
      ) : null}

      {hasItems ? (
        <View style={styles.list}>
          {items.map((item) => (
            <NotificationRow key={item.id} item={item} />
          ))}
        </View>
      ) : (
        <View style={styles.emptyBlock}>
          <Ionicons
            name="notifications-off-outline"
            size={s(48)}
            color={colors.text.secondary}
          />
          <Text style={styles.emptyTitle}>You&apos;re all caught up</Text>
          <Text style={styles.emptyBody}>
            New appointments, confirmations, and cancellations will show up here in real time.
          </Text>
        </View>
      )}
    </Screen>
  );
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const { icon, tint, bg } = kindStyle(item.kind);
  return (
    <View style={[styles.row, !item.read && styles.rowUnread]}>
      <View style={[styles.iconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={s(20)} color={tint} />
      </View>
      <View style={styles.rowText}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.read ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text style={styles.rowBody} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.rowTime}>{relativeTime(item.timestamp)}</Text>
      </View>
    </View>
  );
}

function kindStyle(kind: NotificationKind): {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  bg: string;
} {
  switch (kind) {
    case 'newAppointment':
      return { icon: 'calendar-outline', tint: colors.primary[500], bg: colors.primary[0] };
    case 'updateAppointment':
      return { icon: 'create-outline', tint: colors.primary[500], bg: colors.primary[0] };
    case 'confirmedAppointment':
      return {
        icon: 'checkmark-circle-outline',
        tint: colors.success[500],
        bg: colors.success[0],
      };
    case 'cancelledAppointment':
    case 'bookingDeleted':
      return { icon: 'close-circle-outline', tint: colors.danger[500], bg: colors.danger[10] };
    case 'patientAdded':
      return { icon: 'person-add-outline', tint: colors.success[500], bg: colors.success[0] };
    case 'patientEdited':
      return { icon: 'person-outline', tint: colors.primary[500], bg: colors.primary[0] };
    case 'patientDeleted':
      return {
        icon: 'person-remove-outline',
        tint: colors.danger[500],
        bg: colors.danger[10],
      };
    default:
      return {
        icon: 'information-circle-outline',
        tint: colors.neutral[500],
        bg: colors.background.surface,
      };
  }
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
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
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background.base,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  rowUnread: {
    backgroundColor: colors.primary[0],
    borderColor: colors.primary[0],
  },
  iconWrap: {
    width: s(40),
    height: s(40),
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowTitle: {
    ...typography.body.large,
    fontFamily: 'Inter_600SemiBold',
    color: colors.neutral[500],
    flex: 1,
  },
  unreadDot: {
    width: s(8),
    height: s(8),
    borderRadius: radius.pill,
    backgroundColor: colors.primary[500],
  },
  rowBody: {
    ...typography.body.medium,
    color: colors.text.secondary,
  },
  rowTime: {
    ...typography.body.small,
    color: colors.text.secondary,
    marginTop: 2,
  },
  emptyBlock: {
    paddingVertical: spacing.huge,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.title.medium,
    fontFamily: 'Inter_600SemiBold',
    color: colors.neutral[500],
  },
  emptyBody: {
    ...typography.body.large,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
