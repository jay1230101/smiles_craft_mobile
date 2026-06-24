import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Screen } from '@/components/screen';
import { TextInput } from '@/components/text-input';
import { useSavePlanOfCare } from '@/hooks/use-plan-of-care';
import { ms, s } from '@/lib/responsive';
import { useActiveAppointmentStore } from '@/store/active-appointment';
import { colors, radius, spacing, typography } from '@/theme';

const HEADING_COLOR = '#1A202C';
const SUBTITLE_COLOR = '#64748B';

// Mirrors the web Plan of Care modal's Quick Templates. Tapping a chip appends
// the template text to the current notes — matching the web behaviour exactly.
const QUICK_TEMPLATES: { key: string; label: string; text: string }[] = [
  {
    key: 'crown',
    label: 'Crown',
    text: 'Prepare tooth, temporary crown placement, final crown delivery in 2 weeks.',
  },
  {
    key: 'rct',
    label: 'RCT',
    text: 'Root canal treatment planned in 2 visits. Patient informed of risks and benefits.',
  },
  {
    key: 'implant',
    label: 'Implant',
    text: 'Implant placement planned after CBCT evaluation. Healing period 3 months before restoration.',
  },
  {
    key: 'cleaning',
    label: 'Cleaning',
    text: 'Scaling and polishing completed. Reinforced oral hygiene instructions.',
  },
];

const MAX_LENGTH = 1000;

export default function PlanOfCareScreen() {
  const router = useRouter();
  const event = useActiveAppointmentStore((s) => s.event);
  const clearEvent = useActiveAppointmentStore((s) => s.clear);
  const savePlan = useSavePlanOfCare();

  const [text, setText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  if (!event) {
    return <Redirect href="/(tabs)/calendar" />;
  }

  const fullName = `${(event.name ?? '').trim()} ${(event.family ?? '').trim()}`.trim();
  const mainId = event.extendedProps?.mainId ?? Number(event.id);

  const goBack = () => {
    clearEvent();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/calendar');
  };

  const insertTemplate = (templateText: string) => {
    setText((prev) => {
      const next = prev ? `${prev}\n\n${templateText}` : templateText;
      return next.slice(0, MAX_LENGTH);
    });
    if (formError) setFormError(null);
  };

  const onSubmit = async () => {
    setFormError(null);
    setServerError(null);
    if (!text.trim()) {
      setFormError('Plan of care cannot be empty');
      return;
    }
    try {
      const res = await savePlan.mutateAsync({
        text: text.trim(),
        bookingId: mainId,
        patientId: event.patientId,
      });
      if (res.status === 'success') {
        setSuccessOpen(true);
      } else {
        setServerError(res.message || 'Could not save plan of care.');
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Could not save plan of care.');
    }
  };

  return (
    <Screen contentContainerStyle={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={goBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={s(20)} color={HEADING_COLOR} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>New Plan of Care</Text>
          <Text style={styles.subtitle}>{fullName || 'Patient'}</Text>
        </View>
      </View>

      <View style={styles.formBlock}>
        <View style={styles.templatesBlock}>
          <Text style={styles.sectionLabel}>Quick Templates</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.templatesRow}>
            {QUICK_TEMPLATES.map((t) => (
              <Pressable
                key={t.key}
                accessibilityRole="button"
                accessibilityLabel={`Insert ${t.label} template`}
                onPress={() => insertTemplate(t.text)}
                style={({ pressed }) => [styles.templatePill, pressed && styles.pressed]}>
                <Text style={styles.templateLabel}>{t.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <TextInput
          label="Treatment Notes"
          placeholder="Write the patient's plan of care…"
          value={text}
          onChangeText={(t) => {
            setText(t.slice(0, MAX_LENGTH));
            if (formError) setFormError(null);
          }}
          multiline
          numberOfLines={8}
          maxLength={MAX_LENGTH}
          error={formError}
          containerStyle={styles.textArea}
        />
        <View style={styles.helperRow}>
          <Text style={styles.helper}>
            Saved entries appear in the patient&apos;s Clinical History → Plan of Care page.
          </Text>
          <Text style={styles.counter}>
            {text.length}/{MAX_LENGTH}
          </Text>
        </View>
      </View>

      {serverError ? <Text style={styles.errorText}>{serverError}</Text> : null}

      <View style={styles.actions}>
        <Button
          label="Cancel"
          variant="secondary"
          onPress={goBack}
          fullWidth={false}
          style={styles.flex}
        />
        <Button
          label="Save plan"
          loading={savePlan.isPending}
          onPress={onSubmit}
          fullWidth={false}
          style={styles.flex}
        />
      </View>

      <ConfirmDialog
        visible={successOpen}
        variant="success"
        title="Plan of Care Saved"
        message={`Your plan is saved under ${fullName || 'this patient'}'s Clinical History.`}
        confirmLabel="Done"
        onConfirm={() => {
          setSuccessOpen(false);
          goBack();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    gap: spacing.xl,
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
    color: HEADING_COLOR,
    fontSize: ms(22),
    lineHeight: ms(28),
  },
  subtitle: {
    ...typography.body.large,
    fontFamily: 'Inter_400Regular',
    color: SUBTITLE_COLOR,
    fontSize: ms(14),
    lineHeight: ms(20),
  },
  formBlock: {
    gap: spacing.md,
  },
  templatesBlock: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.body.medium,
    fontFamily: 'Inter_600SemiBold',
    color: colors.neutral[500],
  },
  templatesRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  templatePill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: s(8),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.base,
  },
  templateLabel: {
    ...typography.label.medium,
    color: colors.neutral[500],
  },
  textArea: {
    gap: spacing.xs,
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  helper: {
    ...typography.body.small,
    color: colors.text.secondary,
    flex: 1,
  },
  counter: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  errorText: {
    ...typography.body.medium,
    color: colors.danger[500],
    textAlign: 'center',
  },
  successText: {
    ...typography.body.medium,
    color: colors.success[500],
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
