import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { colors, radius } from '@/theme';

export function ProfileButton() {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open profile and settings"
      onPress={() => router.push('/(tabs)/(home)/profile' as never)}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Ionicons name="person-outline" size={22} color={colors.neutral[500]} />
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
});
