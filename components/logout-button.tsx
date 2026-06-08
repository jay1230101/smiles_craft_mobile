import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { useAuthStore } from '@/store/auth';
import { colors, radius } from '@/theme';

// Interim placement on the Dashboard — to be replaced by a proper
// Profile / Settings screen action item in M3.
export function LogoutButton() {
  const logout = useAuthStore((s) => s.logout);

  const handlePress = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Log out"
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Ionicons name="log-out-outline" size={22} color={colors.neutral[500]} />
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
