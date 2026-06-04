import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ms, s } from '@/lib/responsive';
import { colors, radius, spacing, typography } from '@/theme';

import { StatusPill, type AppointmentStatus } from './status-pill';

type Props = {
  initials: string;
  name: string;
  time: string;
  treatment: string;
  doctor: string;
  status: AppointmentStatus;
  onPress?: () => void;
};

export function AppointmentCard({
  initials,
  name,
  time,
  treatment,
  doctor,
  status,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <StatusPill status={status} />
        </View>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={s(14)} color={colors.text.secondary} />
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text style={styles.treatment}>{treatment}</Text>
        <Text style={styles.doctor}>{doctor}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.background.base,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  pressed: {
    opacity: 0.85,
  },
  avatar: {
    width: s(40),
    height: s(40),
    borderRadius: radius.pill,
    backgroundColor: colors.primary[0],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: ms(13),
    color: colors.primary[500],
  },
  body: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    ...typography.title.medium,
    fontFamily: 'Inter_600SemiBold',
    color: colors.neutral[500],
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  time: {
    ...typography.body.medium,
    color: colors.text.secondary,
  },
  treatment: {
    ...typography.body.medium,
    color: colors.text.primary,
  },
  doctor: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
});
