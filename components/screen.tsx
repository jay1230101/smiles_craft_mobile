import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAX_CONTENT_WIDTH } from '@/lib/responsive';
import { colors, spacing } from '@/theme';

type ScreenProps = {
  children: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
};

export function Screen({
  children,
  scrollable = true,
  contentContainerStyle,
  style,
  edges = ['top', 'bottom', 'left', 'right'],
}: ScreenProps) {
  // When a screen opts out of the bottom safe-area edge (modal screens with
  // their own action rows), the SafeAreaView won't add bottom padding — so
  // on Android phones with a gesture bar (e.g. Samsung Galaxy S25) the
  // primary actions sit flush against the system inset and become hard to
  // tap. Always reserve a generous bottom buffer: bottom inset + spacing,
  // floored at ~80px (button height + clearance) so the action row stays
  // visible even when useSafeAreaInsets reports zero (some modal stacks on
  // Android don't propagate the inset).
  const insets = useSafeAreaInsets();
  const bottomEdgeIncluded = edges.includes('bottom');
  const extraBottom = bottomEdgeIncluded
    ? spacing.xl
    : Math.max(insets.bottom + spacing.xl, spacing.xxxl + spacing.xl);

  const inner = (
    <View
      style={[styles.inner, { paddingBottom: extraBottom }, contentContainerStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scrollable ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {inner}
          </ScrollView>
        ) : (
          inner
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  inner: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
});
