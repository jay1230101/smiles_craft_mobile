import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { PatientCard } from '@/components/patient-card';
import { Screen } from '@/components/screen';
import { useDeletePatient } from '@/hooks/use-delete-patient';
import { usePatients } from '@/hooks/use-patients';
import { ms, s } from '@/lib/responsive';
import { useEditPatientStore } from '@/store/edit-patient';
import { colors, spacing, typography } from '@/theme';
import type { PatientListItem } from '@/types/patients';

const ICON_CIRCLE_BG = '#EFF6FF';
const HEADING_COLOR = '#1A202C';
const PARAGRAPH_COLOR = '#64748B';

export default function RegisterScreen() {
  const router = useRouter();
  const bottomTabHeight = useBottomTabBarHeight();
  const safeBottomPadding = Math.max(bottomTabHeight, 80) + spacing.xxl;
  const { data: patients, isLoading, isError, refetch } = usePatients();
  const setEditPatient = useEditPatientStore((s) => s.setPatient);
  const deletePatient = useDeletePatient();
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<PatientListItem | null>(null);

  const openForm = () => {
    router.push('/patient-register' as never);
  };

  const openEdit = (patient: PatientListItem) => {
    setEditPatient(patient);
    router.push('/patient-edit' as never);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const label = `${pendingDelete.name} ${pendingDelete.family ?? ''}`.trim();
    try {
      const result = await deletePatient.mutateAsync({ id: pendingDelete.id });
      setPendingDelete(null);
      // The backend blocks deleting a patient who still has linked records
      // (appointments, treatments, reminders, documents) — it returns ok:false
      // rather than removing anything, so tell the user why nothing happened.
      if (!result.ok) {
        Alert.alert(
          'Unable to delete patient',
          result.message ||
            `${label || 'This patient'} has linked records and can’t be deleted.`,
        );
      }
    } catch (err) {
      setPendingDelete(null);
      Alert.alert(
        'Unable to delete patient',
        err instanceof Error ? err.message : 'Please try again.',
      );
    }
  };

  const filteredPatients = useMemo(() => {
    const list = patients ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => {
      const haystack = [p.name, p.family, p.phone, p.doctor_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [patients, query]);

  if (isLoading) {
    return (
      <Screen
        contentContainerStyle={[styles.loadingContainer, { paddingBottom: safeBottomPadding }]}
        edges={['top']}>
        <ActivityIndicator color={colors.primary[500]} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen
        contentContainerStyle={[styles.loadingContainer, { paddingBottom: safeBottomPadding }]}
        edges={['top']}>
        <Text style={styles.errorText}>Couldn’t load patients.</Text>
        <Pressable onPress={() => refetch()}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </Screen>
    );
  }

  const total = patients?.length ?? 0;
  const isEmpty = total === 0;

  if (isEmpty) {
    return <EmptyState onAdd={openForm} safeBottomPadding={safeBottomPadding} />;
  }

  return (
    <Screen
      contentContainerStyle={[styles.listContainer, { paddingBottom: safeBottomPadding }]}
      edges={['top']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.push('/(tabs)/(home)' as never)}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={ms(20)} color={HEADING_COLOR} />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.title}>Patient Registration</Text>
          <Text style={styles.subtitle}>{formatTotal(total)} Total Patients</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Register new patient"
          onPress={openForm}
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}>
          <Ionicons name="add" size={ms(24)} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={ms(18)} color={PARAGRAPH_COLOR} />
        <TextInput
          placeholder="Search..."
          placeholderTextColor={PARAGRAPH_COLOR}
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query ? (
          <Pressable accessibilityLabel="Clear search" onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={ms(18)} color={PARAGRAPH_COLOR} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.list}>
        {filteredPatients.length === 0 ? (
          <Text style={styles.noResults}>No patients match “{query}”.</Text>
        ) : (
          filteredPatients.map((p) => (
            <PatientCard
              key={p.id}
              patient={p}
              onEdit={openEdit}
              onDelete={setPendingDelete}
            />
          ))
        )}
      </View>

      <ConfirmDialog
        visible={pendingDelete !== null}
        variant="danger"
        title="Delete Patient"
        message="Are you sure you want to continue? This action cannot be undone."
        cancelLabel="Cancel"
        confirmLabel="Delete"
        loading={deletePatient.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </Screen>
  );
}

function EmptyState({
  onAdd,
  safeBottomPadding,
}: {
  onAdd: () => void;
  safeBottomPadding: number;
}) {
  return (
    <Screen
      contentContainerStyle={[styles.emptyContainer, { paddingBottom: safeBottomPadding }]}
      edges={['top']}>
      <View style={styles.emptyState}>
        <View style={styles.iconBlock}>
          <View style={styles.iconCircle}>
            <Ionicons name="people-outline" size={ms(48)} color={colors.primary[500]} />
          </View>
          <Text style={styles.heading}>No Patients Yet</Text>
          <Text style={styles.paragraph}>
            Start building your patient database by registering your first patient. Add their details to get started.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Register first patient"
          onPress={onAdd}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
          <Ionicons name="person-add-outline" size={ms(20)} color="#FFFFFF" />
          <Text style={styles.ctaLabel}>Register First Patient</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function formatTotal(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

const styles = StyleSheet.create({
  loadingContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  errorText: {
    ...typography.body.large,
    color: colors.danger[500],
    textAlign: 'center',
  },
  retryText: {
    ...typography.label.large,
    color: colors.primary[500],
  },
  listContainer: {
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  backBtn: {
    width: s(40),
    height: s(40),
    borderRadius: s(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.base,
  },
  pressed: {
    opacity: 0.6,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.title.large,
    fontFamily: 'Inter_700Bold',
    fontSize: ms(22),
    lineHeight: ms(28),
    color: HEADING_COLOR,
  },
  subtitle: {
    ...typography.body.medium,
    fontFamily: 'Inter_400Regular',
    fontSize: ms(14),
    lineHeight: ms(20),
    color: PARAGRAPH_COLOR,
  },
  addBtn: {
    width: s(40),
    height: s(40),
    borderRadius: s(10),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[500],
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: s(48),
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.base,
  },
  searchInput: {
    flex: 1,
    ...typography.body.medium,
    color: HEADING_COLOR,
  },
  list: {
    gap: spacing.md,
  },
  noResults: {
    ...typography.body.medium,
    color: PARAGRAPH_COLOR,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    gap: s(32),
  },
  iconBlock: {
    alignItems: 'center',
    gap: s(16),
  },
  iconCircle: {
    width: s(96),
    height: s(96),
    borderRadius: s(48),
    backgroundColor: ICON_CIRCLE_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    ...typography.title.medium,
    fontFamily: 'Inter_600SemiBold',
    fontSize: ms(20),
    lineHeight: ms(28),
    color: HEADING_COLOR,
    textAlign: 'center',
  },
  paragraph: {
    ...typography.body.medium,
    fontFamily: 'Inter_400Regular',
    fontSize: ms(14),
    lineHeight: ms(20),
    color: PARAGRAPH_COLOR,
    textAlign: 'center',
    maxWidth: s(320),
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(8),
    alignSelf: 'stretch',
    height: s(56),
    borderRadius: s(59),
    backgroundColor: colors.primary[500],
    paddingHorizontal: s(16),
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaLabel: {
    ...typography.label.large,
    fontFamily: 'Inter_500Medium',
    fontSize: ms(16),
    lineHeight: ms(24),
    color: '#FFFFFF',
  },
});
