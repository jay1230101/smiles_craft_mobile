import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/theme';

type Props = {
  onPress?: () => void;
  unread?: number;
};

export function ChatButton({ onPress, unread = 0 }: Props) {
  const hasUnread = unread > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Patient chats"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.neutral[500]} />
      {hasUnread ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.base,
  },
  pressed: {
    opacity: 0.7,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: colors.danger[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    lineHeight: 14,
  },
});
