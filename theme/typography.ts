import { ms } from '@/lib/responsive';

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  title: {
    large: {
      fontFamily: fontFamily.regular,
      fontSize: ms(22),
      lineHeight: ms(28),
    },
    medium: {
      fontFamily: fontFamily.medium,
      fontSize: ms(16),
      lineHeight: ms(20),
    },
    small: {
      fontFamily: fontFamily.semibold,
      fontSize: ms(14),
      lineHeight: ms(18),
    },
  },
  label: {
    large: {
      fontFamily: fontFamily.medium,
      fontSize: ms(16),
      lineHeight: ms(19),
    },
    medium: {
      fontFamily: fontFamily.semibold,
      fontSize: ms(14),
      lineHeight: ms(18),
    },
    small: {
      fontFamily: fontFamily.bold,
      fontSize: ms(12),
      lineHeight: ms(16),
    },
  },
  body: {
    large: {
      fontFamily: fontFamily.regular,
      fontSize: ms(16),
      lineHeight: ms(22),
    },
    medium: {
      fontFamily: fontFamily.regular,
      fontSize: ms(14),
      lineHeight: ms(20),
    },
    small: {
      fontFamily: fontFamily.regular,
      fontSize: ms(12),
      lineHeight: ms(16),
    },
  },
} as const;

export type Typography = typeof typography;
