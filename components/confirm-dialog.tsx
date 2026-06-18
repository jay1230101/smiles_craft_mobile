import { Ionicons } from '@expo/vector-icons';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { ms, s } from '@/lib/responsive';
import { colors, spacing, typography } from '@/theme';

const HEADING_COLOR = '#1A202C';
const SUBTITLE_COLOR = '#64748B';
const DANGER_RED = '#DC2626';
const DANGER_RING = '#FEE2E2';
const SUCCESS_GREEN = '#16A34A';
const SUCCESS_RING = '#DCFCE7';
const INFO_BLUE = colors.primary[500];
const INFO_RING = '#DBEAFE';

type Variant = 'danger' | 'primary' | 'success';

type Props = {
  visible: boolean;
  variant?: Variant;
  title: string;
  message: string;
  // When omitted, the cancel button is hidden — useful for single-action
  // result dialogs (e.g. "Patient updated" → "Done").
  cancelLabel?: string;
  confirmLabel: string;
  loading?: boolean;
  onCancel?: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  visible,
  variant = 'danger',
  title,
  message,
  cancelLabel,
  confirmLabel,
  loading = false,
  onCancel,
  onConfirm,
}: Props) {
  const showCancel = !!cancelLabel;
  const styling = getStyling(variant);

  const dismiss = () => {
    if (showCancel) onCancel?.();
    else onConfirm();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
      statusBarTranslucent>
      <TouchableWithoutFeedback onPress={dismiss}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <View style={styles.iconWrap}>
                <View style={[styles.iconCircle, { backgroundColor: styling.ring }]}>
                  <Ionicons name={styling.icon} size={ms(28)} color={styling.accent} />
                </View>
              </View>

              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              <View style={styles.actions}>
                {showCancel ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={cancelLabel}
                    onPress={onCancel}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.btn,
                      styles.btnFlex,
                      styles.cancelBtn,
                      pressed && styles.pressed,
                      loading && styles.disabled,
                    ]}>
                    <Text style={styles.cancelLabel}>{cancelLabel}</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={confirmLabel}
                  onPress={onConfirm}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.btn,
                    showCancel ? styles.btnFlex : styles.btnSingle,
                    {
                      backgroundColor: styling.accent,
                      shadowColor: styling.accent,
                    },
                    pressed && styles.pressed,
                    loading && styles.disabled,
                  ]}>
                  <Text style={styles.confirmLabel}>{loading ? 'Working…' : confirmLabel}</Text>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

type Styling = { accent: string; ring: string; icon: keyof typeof Ionicons.glyphMap };

function getStyling(variant: Variant): Styling {
  switch (variant) {
    case 'success':
      return { accent: SUCCESS_GREEN, ring: SUCCESS_RING, icon: 'checkmark-circle' };
    case 'primary':
      return { accent: INFO_BLUE, ring: INFO_RING, icon: 'information-circle-outline' };
    case 'danger':
    default:
      return { accent: DANGER_RED, ring: DANGER_RING, icon: 'alert-circle-outline' };
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: s(360),
    backgroundColor: colors.background.base,
    borderRadius: s(20),
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  iconWrap: {
    width: s(56),
    height: s(56),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: s(48),
    height: s(48),
    borderRadius: s(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.title.medium,
    fontFamily: 'Inter_700Bold',
    fontSize: ms(18),
    lineHeight: ms(24),
    color: HEADING_COLOR,
    textAlign: 'center',
  },
  message: {
    ...typography.body.medium,
    fontFamily: 'Inter_400Regular',
    fontSize: ms(14),
    lineHeight: ms(20),
    color: SUBTITLE_COLOR,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    alignSelf: 'stretch',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  btn: {
    height: s(44),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    // Colored drop shadow (shadowColor is applied inline per variant).
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
  btnFlex: {
    minWidth: s(110),
    paddingHorizontal: spacing.lg,
  },
  btnSingle: {
    minWidth: s(140),
    paddingHorizontal: spacing.xl,
  },
  cancelBtn: {
    backgroundColor: colors.background.surface,
    // No tint shadow on the neutral cancel button — overwrite the inherited shadow.
    shadowOpacity: 0,
    elevation: 0,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
  cancelLabel: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    fontSize: ms(15),
    color: HEADING_COLOR,
  },
  confirmLabel: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    fontSize: ms(15),
    color: '#FFFFFF',
  },
});
