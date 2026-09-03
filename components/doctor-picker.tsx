import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatDoctorName } from '@/lib/appointments';
import { ms, s } from '@/lib/responsive';
import { colors, radius, spacing, typography } from '@/theme';
import type { Doctor } from '@/types/doctors';

type Props = {
  doctors: Doctor[];
  selectedDoctorId: number | null;
  onSelect: (id: number | null) => void;
};

export function DoctorPicker({ doctors, selectedDoctorId, onSelect }: Props) {
  // Single-doctor clinics never need a picker — the "All Doctors" toggle
  // becomes a no-op since the set of events is identical either way. Hide
  // the whole strip rather than render a one-chip row, which would look
  // like a broken filter UI.
  if (doctors.length <= 1) return null;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.strip}>
        <Chip
          label="All Doctors"
          active={selectedDoctorId === null}
          onPress={() => onSelect(null)}
        />
        {doctors.map((d) => {
          const name = `${(d.name ?? '').trim()} ${(d.family ?? '').trim()}`.trim();
          // Show the clinician name exactly as stored — the "Dr" honorific is
          // optional and only appears when the name itself carries it.
          const label = formatDoctorName(name) || 'Doctor';
          return (
            <Chip
              key={d.id}
              label={label}
              active={selectedDoctorId === d.id}
              onPress={() => onSelect(d.id)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.chipPressed,
      ]}>
      <View>
        <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const CHIP_HEIGHT = s(40);

const styles = StyleSheet.create({
  // Wrapper pins the picker's vertical footprint so the surrounding column
  // layout doesn't shift as chips swap between regular / semibold weights or
  // the ScrollView's intrinsic height resolves differently between scroll
  // positions.
  wrapper: {
    height: CHIP_HEIGHT,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },
  chip: {
    height: CHIP_HEIGHT,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.base,
  },
  chipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipText: {
    ...typography.label.medium,
    fontSize: ms(13),
    color: colors.text.secondary,
  },
  chipTextActive: {
    color: colors.text.inverse,
    fontFamily: 'Inter_600SemiBold',
  },
});
