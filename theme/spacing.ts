import { s } from '@/lib/responsive';

export const spacing = {
  xxs: s(2),
  xs: s(4),
  sm: s(8),
  md: s(12),
  lg: s(16),
  xl: s(24),
  xxl: s(32),
  huge: s(40),
  xxxl: s(48),
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export type Spacing = typeof spacing;
export type Radius = typeof radius;
