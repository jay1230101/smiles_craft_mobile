import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/screen';
import { usePatientChats } from '@/hooks/use-patient-chats';
import { useChatUnreadStore } from '@/store/chat-unread';
import { ms, s } from '@/lib/responsive';
import { colors, spacing, typography } from '@/theme';
import type { ChatThread } from '@/types/chats';

const HEADING_COLOR = '#1A202C';
const SUBTITLE_COLOR = '#64748B';

export default function PatientChatsScreen() {
  const router = useRouter();
  const { data: threads, isLoading, isError, refetch, isRefetching } = usePatientChats();
  const markSeen = useChatUnreadStore((s) => s.markSeen);

  // Pull the freshest history whenever this screen is looked at.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const list = threads ?? [];

  // Looking at the chat screen marks everything loaded as seen, which clears
  // the home badge and persists the new marker (so it stays cleared after an
  // app restart). Re-runs when a refetch brings newer messages into view.
  useEffect(() => {
    if (threads && threads.length > 0) markSeen(threads);
  }, [threads, markSeen]);

  return (
    <Screen scrollable={false} contentContainerStyle={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/(home)'))}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={ms(20)} color={HEADING_COLOR} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Patient Chats</Text>
          <Text style={styles.subtitle}>Messages patients sent — last 30 days</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary[500]} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Couldn’t load messages.</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(t) => t.patient_phone}
          renderItem={({ item }) => <ThreadCard thread={item} />}
          style={styles.flex}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={Separator}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <View style={styles.emptyIcon}>
                <Ionicons name="chatbubbles-outline" size={ms(40)} color={colors.primary[500]} />
              </View>
              <Text style={styles.emptyText}>No messages in the last 30 days.</Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

function ThreadCard({ thread }: { thread: ChatThread }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(thread.patient_name)}</Text>
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.patientName} numberOfLines={1}>
            {thread.patient_name || 'A patient'}
          </Text>
          <Text style={styles.patientPhone} numberOfLines={1}>
            {thread.patient_phone}
          </Text>
        </View>
      </View>

      <View style={styles.messages}>
        {thread.messages.map((m, idx) => (
          <View key={`${thread.patient_phone}-${idx}`} style={styles.bubble}>
            <Text style={styles.bubbleText}>{m.message}</Text>
            <Text style={styles.bubbleTime}>{m.timestamp}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

function initialsOf(name?: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    gap: spacing.lg,
    paddingBottom: 0,
  },
  flex: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.title.large,
    fontFamily: 'Inter_700Bold',
    fontSize: ms(22),
    lineHeight: ms(28),
    color: HEADING_COLOR,
  },
  subtitle: {
    ...typography.body.medium,
    fontSize: ms(14),
    color: SUBTITLE_COLOR,
  },
  center: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyIcon: {
    width: s(80),
    height: s(80),
    borderRadius: s(40),
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body.medium,
    color: SUBTITLE_COLOR,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body.large,
    color: colors.danger[500],
    textAlign: 'center',
  },
  retryText: {
    ...typography.label.large,
    color: colors.primary[500],
  },
  separator: {
    height: spacing.md,
  },
  card: {
    borderRadius: s(14),
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.base,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.label.large,
    fontFamily: 'Inter_700Bold',
    color: colors.primary[500],
    fontSize: ms(14),
  },
  cardHeaderText: {
    flex: 1,
    gap: 2,
  },
  patientName: {
    ...typography.body.large,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
  },
  patientPhone: {
    ...typography.body.small,
    color: SUBTITLE_COLOR,
  },
  messages: {
    gap: spacing.sm,
  },
  bubble: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    backgroundColor: '#F1F5F9',
    borderRadius: s(12),
    borderTopLeftRadius: s(4),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  bubbleText: {
    ...typography.body.medium,
    color: HEADING_COLOR,
  },
  bubbleTime: {
    ...typography.body.small,
    fontSize: ms(11),
    color: SUBTITLE_COLOR,
    alignSelf: 'flex-end',
  },
});
