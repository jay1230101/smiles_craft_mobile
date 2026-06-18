import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type View as RNView,
} from 'react-native';

import { ms, s, screenWidth } from '@/lib/responsive';
import { colors, spacing, typography } from '@/theme';
import type { PatientListItem } from '@/types/patients';

type Anchor = { top: number; right: number };

const HEADING_COLOR = '#1A202C';
const SUBTITLE_COLOR = '#64748B';
const AVATAR_BG = '#EFF6FF';
const ALLERGY_RED = '#DC2626';

type Props = {
  patient: PatientListItem;
  onEdit?: (p: PatientListItem) => void;
  onDelete?: (p: PatientListItem) => void;
};

export function PatientCard({ patient, onEdit, onDelete }: Props) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const triggerRef = useRef<RNView>(null);

  const initials = getInitials(patient.name, patient.family);
  const age = ageFromDob(patient.dob);

  // Anchor the popover to the 3-dots button's screen position so it sits
  // directly under the trigger instead of centered on the screen.
  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, w, h) => {
      const top = y + h + s(6);
      const right = Math.max(s(12), screenWidth - (x + w));
      setAnchor({ top, right });
    });
  };

  const closeMenu = () => setAnchor(null);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={styles.nameBlock}>
              <Text style={styles.name} numberOfLines={1}>
                {patient.name}
              </Text>
              {patient.family ? (
                <Text style={styles.family} numberOfLines={1}>
                  {patient.family}
                </Text>
              ) : null}
            </View>

            <View ref={triggerRef} collapsable={false}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="More actions"
                hitSlop={10}
                onPress={openMenu}
                style={({ pressed }) => [styles.menuBtn, pressed && styles.pressed]}>
                <Ionicons name="ellipsis-vertical" size={ms(18)} color={SUBTITLE_COLOR} />
              </Pressable>
            </View>
          </View>

          <View style={styles.detailsGrid}>
            <DetailCell label="Age" value={age ? `${age} Years` : '—'} />
            <DetailCell label="Gender" value={patient.gender || '—'} />
            <DetailCell label="Phone" value={patient.phone || '—'} />
            <DetailCell label="Clinician" value={patient.doctor_name || '—'} />
          </View>

          {patient.allergy ? (
            <Text style={styles.allergy} numberOfLines={2}>
              Allergies: {patient.allergy}
            </Text>
          ) : null}
        </View>
      </View>

      <Modal
        visible={anchor !== null}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
        statusBarTranslucent>
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={styles.modalBackdrop} onPress={closeMenu} />
          {anchor ? (
            <View style={[styles.menu, { top: anchor.top, right: anchor.right }]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  closeMenu();
                  onEdit?.(patient);
                }}
                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
                <Ionicons name="create-outline" size={ms(18)} color={colors.primary[500]} />
                <Text style={[styles.menuLabel, { color: colors.primary[500] }]}>Edit</Text>
              </Pressable>
              <View style={styles.menuDivider} />
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  closeMenu();
                  onDelete?.(patient);
                }}
                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
                <Ionicons name="trash-outline" size={ms(18)} color={ALLERGY_RED} />
                <Text style={[styles.menuLabel, { color: ALLERGY_RED }]}>Delete</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailCell}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function getInitials(name?: string, family?: string): string {
  const first = (name ?? '').trim().charAt(0).toUpperCase();
  const last = (family ?? '').trim().charAt(0).toUpperCase();
  if (first && last) return `${first}${last}`;
  if (first) return first;
  return '?';
}

function ageFromDob(dob?: string): number | null {
  if (!dob) return null;
  const date = new Date(dob);
  if (isNaN(date.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) {
    years -= 1;
  }
  return years > 0 ? years : null;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.base,
    borderRadius: s(16),
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  avatar: {
    width: s(48),
    height: s(48),
    borderRadius: s(24),
    backgroundColor: AVATAR_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    fontSize: ms(14),
    color: colors.primary[500],
  },
  body: {
    flex: 1,
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nameBlock: {
    flex: 1,
  },
  name: {
    ...typography.title.medium,
    fontFamily: 'Inter_600SemiBold',
    fontSize: ms(16),
    lineHeight: ms(22),
    color: HEADING_COLOR,
  },
  family: {
    ...typography.body.medium,
    fontFamily: 'Inter_400Regular',
    fontSize: ms(13),
    lineHeight: ms(18),
    color: SUBTITLE_COLOR,
  },
  menuBtn: {
    width: s(24),
    height: s(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  detailCell: {
    width: '46%',
    gap: 2,
  },
  detailLabel: {
    ...typography.body.medium,
    fontFamily: 'Inter_600SemiBold',
    fontSize: ms(13),
    color: HEADING_COLOR,
  },
  detailValue: {
    ...typography.body.medium,
    fontFamily: 'Inter_400Regular',
    fontSize: ms(13),
    color: SUBTITLE_COLOR,
  },
  allergy: {
    ...typography.body.medium,
    fontFamily: 'Inter_500Medium',
    fontSize: ms(13),
    color: ALLERGY_RED,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  menu: {
    position: 'absolute',
    width: s(240),
    backgroundColor: colors.background.base,
    borderRadius: s(14),
    paddingVertical: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  menuItemPressed: {
    backgroundColor: colors.background.surface,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginHorizontal: spacing.md,
  },
  menuLabel: {
    ...typography.label.large,
    fontFamily: 'Inter_500Medium',
    fontSize: ms(14),
  },
});
