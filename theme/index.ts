export { colors, palette } from './colors';
export type { Colors, ColorPalette } from './colors';

export { typography, fontFamily } from './typography';
export type { Typography } from './typography';

export { spacing, radius } from './spacing';
export type { Spacing, Radius } from './spacing';

import { colors } from './colors';
import { typography, fontFamily } from './typography';
import { spacing, radius } from './spacing';

export const theme = {
  colors,
  typography,
  fontFamily,
  spacing,
  radius,
} as const;

export type Theme = typeof theme;
