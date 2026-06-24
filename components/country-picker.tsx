import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TextInput } from '@/components/text-input';
import { ms, s } from '@/lib/responsive';
import { COUNTRIES, flagEmoji, type Country } from '@/lib/countries';
import { colors, radius, spacing, typography } from '@/theme';

const SUBTITLE_COLOR = '#64748B';
const HEADING_COLOR = '#1A202C';

type Props = {
  value: Country;
  onChange: (country: Country) => void;
  style?: StyleProp<ViewStyle>;
};

export function CountryPicker({ value, onChange, style }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    const digits = q.replace(/\D/g, '');
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.iso.toLowerCase().includes(q) ||
        (digits && c.dial.startsWith(digits)),
    );
  }, [query]);

  const openSheet = () => {
    setQuery('');
    setOpen(true);
  };
  const closeSheet = () => setOpen(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Country code, currently ${value.name}`}
        onPress={openSheet}
        style={({ pressed }) => [styles.chip, style, pressed && styles.pressed]}>
        <Text style={styles.flag}>{flagEmoji(value.iso)}</Text>
        <Ionicons name="chevron-down" size={ms(16)} color={SUBTITLE_COLOR} />
      </Pressable>

      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={closeSheet}
        statusBarTranslucent
        presentationStyle="overFullScreen">
        <Pressable style={styles.backdrop} onPress={closeSheet}>
          <Pressable
            style={[styles.sheet, { paddingBottom: spacing.xxl + insets.bottom }]}
            onPress={() => {}}>
            <Text style={styles.sheetTitle}>Select country</Text>
            <TextInput
              placeholder="Search country or dial code"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              containerStyle={styles.search}
            />
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No matching country</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled">
                {filtered.map((c) => {
                  const isSelected = c.iso === value.iso;
                  return (
                    <Pressable
                      key={c.iso}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => {
                        onChange(c);
                        closeSheet();
                      }}
                      style={({ pressed }) => [
                        styles.row,
                        isSelected && styles.rowSelected,
                        pressed && styles.rowPressed,
                      ]}>
                      <Text style={styles.rowFlag}>{flagEmoji(c.iso)}</Text>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text style={styles.rowDial}>+{c.dial}</Text>
                      {isSelected ? (
                        <Ionicons
                          name="checkmark"
                          size={s(18)}
                          color={colors.primary[500]}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: s(48),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: s(12),
    backgroundColor: colors.background.base,
  },
  flag: {
    fontSize: ms(20),
  },
  pressed: {
    opacity: 0.7,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background.base,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    maxHeight: '80%',
  },
  sheetTitle: {
    ...typography.title.medium,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
  },
  search: {
    marginBottom: spacing.md,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: s(12),
    borderRadius: radius.md,
  },
  rowSelected: {
    backgroundColor: colors.primary[0],
  },
  rowPressed: {
    backgroundColor: colors.background.surface,
  },
  rowFlag: {
    fontSize: ms(22),
  },
  rowName: {
    ...typography.body.large,
    color: HEADING_COLOR,
    flex: 1,
  },
  rowDial: {
    ...typography.body.medium,
    color: SUBTITLE_COLOR,
  },
  empty: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body.medium,
    color: SUBTITLE_COLOR,
  },
});
