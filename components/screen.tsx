import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

type ScreenProps = {
  children: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
};

export function Screen({
  children,
  scrollable = true,
  contentContainerStyle,
  style,
  edges = ['top', 'bottom', 'left', 'right'],
}: ScreenProps) {
  const inner = (
    <View style={[styles.inner, contentContainerStyle]}>{children}</View>
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
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
