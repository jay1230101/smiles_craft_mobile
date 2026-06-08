import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ms, s } from '@/lib/responsive';
import { colors, radius, spacing, typography } from '@/theme';
import type { Doctor } from '@/types/doctors';

type Props = {
  doctors: Doctor[];
  selectedDoctorId: number | null;
  onSelect: (id: number | null) => void;
};

export function DoctorPicker({ doctors, selectedDoctorId, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}>
      <Chip
        label="All Doctors"
        active={selectedDoctorId === null}
        onPress={() => onSelect(null)}
      />
      {doctors.map((d) => {
        const name = `${(d.name ?? '').trim()} ${(d.family ?? '').trim()}`.trim();
        const label = name ? `Dr. ${name}` : 'Doctor';
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

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: s(8),
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
