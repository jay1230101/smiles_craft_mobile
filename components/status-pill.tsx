import { StyleSheet, Text, View } from 'react-native';

import { ms } from '@/lib/responsive';
import { colors, radius, spacing } from '@/theme';

export type AppointmentStatus = 'confirmed' | 'cancelled' | 'unconfirmed';

type Props = {
  status: AppointmentStatus;
};

const config: Record<AppointmentStatus, { label: string; bg: string; fg: string }> = {
  confirmed: {
    label: 'Confirmed',
    bg: colors.success[0],
    fg: colors.success[500],
  },
  cancelled: {
    label: 'Cancelled',
    bg: colors.danger[10],
    fg: colors.danger[500],
  },
  unconfirmed: {
    label: 'Unconfirmed',
    bg: colors.warning[10],
    fg: colors.warning[700],
  },
};

export function StatusPill({ status }: Props) {
  const { label, bg, fg } = config[status];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: 'Inter_500Medium',
    fontSize: ms(12),
    lineHeight: ms(16),
  },
});
