import { Image, type ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { s } from '@/lib/responsive';
import { colors, radius, spacing, typography } from '@/theme';

type Props = {
  iconSource: ImageSourcePropType;
  title: string;
  subtitle?: string;
};

export function PlaceholderScreen({ iconSource, title, subtitle }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Image
            source={iconSource}
            style={styles.icon}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  iconWrap: {
    width: s(96),
    height: s(96),
    borderRadius: radius.pill,
    backgroundColor: colors.primary[0],
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: s(48),
    height: s(48),
    tintColor: colors.primary[500],
  },
  title: {
    ...typography.title.large,
    fontFamily: 'Inter_600SemiBold',
    color: colors.neutral[500],
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body.large,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
