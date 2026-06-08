import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { ms, s } from '@/lib/responsive';
import { colors, radius, spacing, typography } from '@/theme';

export type SummaryVariant = 'confirmed' | 'cancelled' | 'unconfirmed' | 'total';

type Props = {
  variant: SummaryVariant;
  label: string;
  count: number;
  caption: string;
};

const variantConfig: Record<
  SummaryVariant,
  { icon: keyof typeof Ionicons.glyphMap; iconColor: string; iconBg: string; captionColor: string }
> = {
  confirmed: {
    icon: 'checkmark-circle-outline',
    iconColor: colors.success[500],
    iconBg: colors.success[0],
    captionColor: colors.success[500],
  },
  cancelled: {
    icon: 'close-circle-outline',
    iconColor: colors.danger[500],
    iconBg: colors.danger[10],
    captionColor: colors.danger[500],
  },
  unconfirmed: {
    icon: 'sparkles-outline',
    iconColor: colors.primary[500],
    iconBg: colors.primary[0],
    captionColor: colors.success[500],
  },
  total: {
    icon: 'calendar-outline',
    iconColor: colors.primary[500],
    iconBg: colors.primary[0],
    captionColor: colors.text.secondary,
  },
};

export function SummaryCard({ variant, label, count, caption }: Props) {
  const { icon, iconColor, iconBg, captionColor } = variantConfig[variant];
  const padded = count < 10 ? String(count).padStart(2, '0') : String(count);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={s(18)} color={iconColor} />
        </View>
      </View>
      <Text style={styles.count}>{padded}</Text>
      <Text style={[styles.caption, { color: captionColor }]}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.background.base,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.body.medium,
    color: colors.text.secondary,
    flex: 1,
  },
  iconWrap: {
    width: s(32),
    height: s(32),
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    fontFamily: 'Inter_700Bold',
    fontSize: ms(28),
    lineHeight: ms(34),
    color: colors.neutral[500],
  },
  caption: {
    ...typography.body.small,
    fontFamily: 'Inter_500Medium',
  },
});
