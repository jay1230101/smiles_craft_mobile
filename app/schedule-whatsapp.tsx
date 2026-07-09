import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DateField } from '@/components/date-field';
import { Screen } from '@/components/screen';
import { Select, type SelectOption } from '@/components/select';
import { useStoreReminder, useWhatsAppTemplates } from '@/hooks/use-whatsapp-templates';
import { ms, s } from '@/lib/responsive';
import { useActiveAppointmentStore } from '@/store/active-appointment';
import { colors, radius, spacing, typography } from '@/theme';

const HEADING_COLOR = '#1A202C';
const SUBTITLE_COLOR = '#64748B';

const DOB_REGEX = /^(\d{2})-(\d{2})-(\d{4})$/;

export default function ScheduleWhatsAppScreen() {
  const router = useRouter();
  const event = useActiveAppointmentStore((s) => s.event);
  const clearEvent = useActiveAppointmentStore((s) => s.clear);
  const { data: templates, isLoading } = useWhatsAppTemplates();
  const storeReminder = useStoreReminder();

  const [templateName, setTemplateName] = useState<string | null>(null);
  const [date, setDate] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  const templateOptions: SelectOption<string>[] = useMemo(
    () =>
      (templates ?? []).map((t) => ({
        value: t.name,
        label: t.label ?? t.name,
      })),
    [templates],
  );

  if (!event) {
    return <Redirect href="/(tabs)/calendar" />;
  }

  const fullName = `${(event.name ?? '').trim()} ${(event.family ?? '').trim()}`.trim();

  const goBack = () => {
    clearEvent();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/calendar');
  };

  // Earliest selectable = tomorrow (this is a *future* reminder).
  const minDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  // Bound to ~3 years out so the spinner is sensible.
  const maxDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 3);
    return d;
  })();

  const onSubmit = async () => {
    setFormError(null);
    setServerError(null);
    if (!templateName) {
      setFormError('Pick a WhatsApp template');
      return;
    }
    const iso = ddMmYyyyToIso(date);
    if (!iso) {
      setFormError('Pick a future date');
      return;
    }

    try {
      const res = await storeReminder.mutateAsync({
        patientId: event.patientId,
        // The backend resolves the reminder's doctor from the appointment when
        // bookingEncounterId is present (BookingEncounter.doctor_id). Without
        // it, store_reminders falls back to requiring a `doctor` id inside each
        // reminder and returns "Doctor missing …". mainId is that booking id
        // (same value the web app sends).
        bookingEncounterId: event.extendedProps.mainId,
        [templateName]: { checked: true, date: iso },
      });
      if (res.status === 'success') {
        setSuccessOpen(true);
      } else {
        setServerError(res.message || 'Could not schedule reminder.');
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Could not schedule reminder.');
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
          <Text style={styles.title}>Schedule Future WhatsApp</Text>
          <Text style={styles.subtitle}>{fullName || 'Patient'}</Text>
        </View>
      </View>

      <Text style={styles.helper}>
        Schedule a future WhatsApp message — e.g. a 6-month check-up reminder. The reminder
        will be sent automatically on the date you choose.
      </Text>

      <View style={styles.formBlock}>
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary[500]} />
          </View>
        ) : (
          <Select<string>
            label="WhatsApp template *"
            placeholder="Select a template"
            value={templateName}
            options={templateOptions}
            onChange={(v) => {
              setTemplateName(v);
              if (formError) setFormError(null);
            }}
          />
        )}

        <DateField
          label="Send on *"
          value={date}
          onChange={(v) => {
            setDate(v);
            if (formError) setFormError(null);
          }}
          placeholder="Pick a future date"
          minimumDate={minDate}
          maximumDate={maxDate}
        />

        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
      </View>

      <View style={styles.actions}>
        <Button
          label="Cancel"
          variant="secondary"
          onPress={goBack}
          fullWidth={false}
          style={styles.flex}
        />
        <Button
          label="Schedule"
          loading={storeReminder.isPending}
          onPress={onSubmit}
          fullWidth={false}
          style={styles.flex}
        />
      </View>

      <ConfirmDialog
        visible={successOpen}
        variant="success"
        title="Reminder Scheduled"
        message={`We'll send the WhatsApp reminder to ${fullName || 'this patient'} on the chosen date.`}
        confirmLabel="Done"
        onConfirm={() => {
          setSuccessOpen(false);
          goBack();
        }}
      />

      <ConfirmDialog
        visible={serverError !== null}
        variant="danger"
        title="Couldn't schedule reminder"
        message={serverError ?? ''}
        confirmLabel="OK"
        onConfirm={() => setServerError(null)}
      />
    </Screen>
  );
}

function ddMmYyyyToIso(value: string): string | null {
  const m = value.match(DOB_REGEX);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
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
  helper: {
    ...typography.body.medium,
    color: colors.text.secondary,
  },
  formBlock: {
    gap: spacing.lg,
  },
  loading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
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
  radius: {
    borderRadius: radius.md,
  },
});
