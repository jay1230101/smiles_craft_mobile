import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const logo = require('@/assets/images/brand/smilecraft-wordmark.png');

const ASPECT = 592 / 174;

type BrandLogoProps = {
  size?: 'small' | 'medium' | 'large';
  width?: number;
  style?: StyleProp<ViewStyle>;
};

const PRESETS = {
  small: 160,
  medium: 227,
  large: 296,
} as const;

export function BrandLogo({ size = 'medium', width, style }: BrandLogoProps) {
  const w = width ?? PRESETS[size];
  const h = w / ASPECT;
  return (
    <View style={[styles.wrap, style]}>
      <Image source={logo} resizeMode="contain" style={{ width: w, height: h }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
