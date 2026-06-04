import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Design baseline width (iPhone 14/15 logical width).
const BASE_WIDTH = 390;

// Raw scale factor, then clamped on both ends so very small phones
// don't crush content and tablets don't blow it up.
const RAW = SCREEN_WIDTH / BASE_WIDTH;
const SIZE_SCALE = Math.min(Math.max(RAW, 0.88), 1.18);
const FONT_SCALE = Math.min(Math.max(RAW, 0.92), 1.12);

/** Scale a spacing/size value proportionally to screen width. */
export function s(n: number): number {
  return Math.round(n * SIZE_SCALE);
}

/** Scale a font size — gentler scaling than spacing for readability. */
export function ms(n: number): number {
  return Math.round(n * FONT_SCALE);
}

/** Maximum centered content width — content stops growing past this on tablets. */
export const MAX_CONTENT_WIDTH = 600;

export const screenWidth = SCREEN_WIDTH;
export const screenHeight = SCREEN_HEIGHT;
export const isTablet = SCREEN_WIDTH >= 600;
export const isSmallPhone = SCREEN_WIDTH < 360;
