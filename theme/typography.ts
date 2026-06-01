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
      fontSize: 22,
      lineHeight: 28,
    },
    medium: {
      fontFamily: fontFamily.medium,
      fontSize: 16,
      lineHeight: 20,
    },
    small: {
      fontFamily: fontFamily.semibold,
      fontSize: 14,
      lineHeight: 18,
    },
  },
  label: {
    large: {
      fontFamily: fontFamily.medium,
      fontSize: 16,
      lineHeight: 19,
    },
    medium: {
      fontFamily: fontFamily.semibold,
      fontSize: 14,
      lineHeight: 18,
    },
    small: {
      fontFamily: fontFamily.bold,
      fontSize: 12,
      lineHeight: 16,
    },
  },
  body: {
    large: {
      fontFamily: fontFamily.regular,
      fontSize: 16,
      lineHeight: 22,
    },
    medium: {
      fontFamily: fontFamily.regular,
      fontSize: 14,
      lineHeight: 20,
    },
    small: {
      fontFamily: fontFamily.regular,
      fontSize: 12,
      lineHeight: 16,
    },
  },
} as const;

export type Typography = typeof typography;
