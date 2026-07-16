import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';

import { connectSocket, disconnectSocket, type ServerEvent } from '@/api/socket';
import { DEMO_MODE, getMockNotifications } from '@/lib/mock-appointments';
import { useAuthStore } from '@/store/auth';
import { useNotificationsStore } from '@/store/notifications';
import type { BackendEvent } from '@/types/appointments';
import type { NotificationKind } from '@/types/notifications';

const APPOINTMENT_EVENTS: ServerEvent[] = [
  'newAppointment',
  'updateAppointment',
  'confirmedAppointment',
  'cancelledAppointment',
  'bookingDeleted',
];

const PATIENT_EVENTS: ServerEvent[] = ['patientAdded', 'patientEdited', 'patientDeleted'];

// Cashier "Patients in Clinic" list (billing tab). The backend broadcasts these
// to the same clinic/doctor room this socket already joins:
//   - updateBills     -> a patient entered the cashier queue (new charges)
//   - removeFromBills -> a patient's charges were cleared/deleted
// Mirrors the web's BillingContext. A plain payment (discharge) emits no
// clinic-room event, so the billing tab also refetches on focus
// (app/(tabs)/billing.tsx) to catch that case. These are background list
// syncs, so they invalidate the cache but never raise a notification.
const BILLING_EVENTS: ServerEvent[] = ['updateBills', 'removeFromBills'];

// Per client feedback (2026-06-29 #9): the notifications feed is too noisy.
// Cache invalidation still fires for every event below so the calendar/patient
// list stay live, but the bell + notifications screen only surface events the
// user actually wants to be alerted about: reschedules, staff cancellations,
// and patient-initiated WhatsApp confirm/cancel.
const NOTIFY_EVENTS: ReadonlySet<ServerEvent> = new Set<ServerEvent>([
  'updateAppointment',
  'confirmedAppointment',
  'cancelledAppointment',
]);

// The backend assigns each connection to the right Socket.IO room based on the
// JWT it sees on connect (`socket_events.py` server-side):
//   - Owner Doctors + Assistants + Admins -> `clinic_<clinic_id>` (whole clinic)
//   - Non-owner Doctors                   -> `doctor_<user_id>` (own only)
// So this hook just connects with the user's token; scope is enforced server-side.
export function useSocketEvents() {
  const token = useAuthStore((s) => s.token);
  const status = useAuthStore((s) => s.status);
  const queryClient = useQueryClient();
  const pushNotification = useNotificationsStore((s) => s.push);
  const hydrateNotifications = useNotificationsStore((s) => s.hydrate);
  const notificationCount = useNotificationsStore((s) => s.items.length);

  // Seed sample notifications once in demo mode so the bell badge has something
  // to show without waiting on live socket events.
  useEffect(() => {
    if (DEMO_MODE && notificationCount === 0) {
      hydrateNotifications(getMockNotifications());
    }
  }, [hydrateNotifications, notificationCount]);

  useEffect(() => {
    const shouldConnect =
      !DEMO_MODE &&
      status === 'authenticated' &&
      !!token &&
      token !== 'dev-bypass-token';

    if (!shouldConnect || !token) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket(token);

    const invalidateAppointments = () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'all-events'] });
    };
    const invalidatePatients = () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    };
    const invalidateBills = () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    };

    const makeAppointmentHandler = (event: ServerEvent) => (payload: unknown) => {
      invalidateAppointments();
      if (NOTIFY_EVENTS.has(event)) {
        // The confirm/cancel socket events only carry `{ id }` — no patient
        // name — so the bell used to read "An appointment was cancelled."
        // Backfill the name + visit date from the cached appointment (matched
        // by mainId) so the message names who cancelled/confirmed, mirroring
        // the backend push notification.
        const enriched = enrichAppointmentPayload(payload, queryClient);
        pushNotification(buildNotification(event, enriched));
      }
    };
    const makePatientHandler = (event: ServerEvent) => (payload: unknown) => {
      invalidatePatients();
      if (NOTIFY_EVENTS.has(event)) {
        pushNotification(buildNotification(event, payload));
      }
    };

    const appointmentHandlers = APPOINTMENT_EVENTS.map((event) => {
      const handler = makeAppointmentHandler(event);
      socket.on(event, handler);
      return { event, handler };
    });
    const patientHandlers = PATIENT_EVENTS.map((event) => {
      const handler = makePatientHandler(event);
      socket.on(event, handler);
      return { event, handler };
    });
    const billingHandlers = BILLING_EVENTS.map((event) => {
      socket.on(event, invalidateBills);
      return { event, handler: invalidateBills };
    });

    return () => {
      appointmentHandlers.forEach(({ event, handler }) => socket.off(event, handler));
      patientHandlers.forEach(({ event, handler }) => socket.off(event, handler));
      billingHandlers.forEach(({ event, handler }) => socket.off(event, handler));
    };
  }, [token, status, queryClient, pushNotification]);
}

function buildNotification(event: ServerEvent, payload: unknown) {
  const id = `${event}-${extractId(payload)}-${Date.now()}`;
  const timestamp = new Date().toISOString();
  const kind = event as NotificationKind;
  return { id, kind, timestamp, ...titleAndBody(event, payload) };
}

function titleAndBody(event: ServerEvent, payload: unknown): { title: string; body: string } {
  const name = extractPatientName(payload);
  const visitDate = extractVisitDate(payload);
  switch (event) {
    case 'newAppointment':
      return { title: 'New appointment', body: name ? `Booked for ${name}.` : 'A new appointment has been booked.' };
    // Update / confirm / cancel bodies mirror the backend push wording
    // (views.py) and name the patient. visitDate is the appointment's date —
    // the NEW date for a reschedule (the update payload carries it), else the
    // appointment's scheduled date (backfilled from cache for confirm/cancel).
    case 'updateAppointment':
      return {
        title: 'Appointment updated',
        body: name
          ? visitDate
            ? `${name}'s appointment rescheduled to ${visitDate}`
            : `${name}'s appointment was updated.`
          : 'An appointment was updated.',
      };
    case 'confirmedAppointment':
      return {
        title: 'Appointment confirmed',
        body: name
          ? visitDate
            ? `${name} confirmed appointment for ${visitDate}`
            : `${name} confirmed their appointment.`
          : 'Appointment confirmed.',
      };
    case 'cancelledAppointment':
      return {
        title: 'Appointment cancelled',
        body: name
          ? visitDate
            ? `${name} cancelled their ${visitDate} appointment`
            : `${name}'s appointment was cancelled.`
          : 'An appointment was cancelled.',
      };
    case 'bookingDeleted':
      return { title: 'Booking removed', body: 'A booking was deleted.' };
    case 'patientAdded':
      return { title: 'Patient registered', body: name ? `${name} was added to the clinic.` : 'A new patient was registered.' };
    case 'patientEdited':
      return { title: 'Patient updated', body: name ? `${name}'s record was updated.` : 'A patient record was updated.' };
    case 'patientDeleted':
      return { title: 'Patient removed', body: name ? `${name} was removed.` : 'A patient record was removed.' };
    default:
      return { title: 'Update', body: 'Clinic data changed.' };
  }
}

// The confirm/cancel socket payloads are just `{ id, confirmed|cancelled }`.
// Look the appointment up in the cached /getAllEvents list (matched on the
// booking id, which the backend exposes as extendedProps.mainId) and fold its
// name + visit_date into the payload so titleAndBody can name the patient.
function enrichAppointmentPayload(payload: unknown, queryClient: QueryClient): unknown {
  const base =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  if (typeof base.name === 'string' && base.name.trim() !== '') return base;

  const cached = findCachedEventByMainId(queryClient, base.id);
  if (!cached) return base;
  return {
    ...base,
    name: cached.name,
    family: cached.family,
    visit_date: cached.visit_date,
  };
}

function findCachedEventByMainId(
  queryClient: QueryClient,
  id: unknown,
): BackendEvent | undefined {
  if (id == null) return undefined;
  const events = queryClient.getQueryData<BackendEvent[]>(['appointments', 'all-events']);
  if (!Array.isArray(events)) return undefined;
  const target = String(id);
  return events.find(
    (e) => String(e.extendedProps?.mainId) === target || String(e.id) === target,
  );
}

function extractVisitDate(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const v = (payload as Record<string, unknown>).visit_date;
  return typeof v === 'string' ? v : '';
}

function extractId(payload: unknown): string {
  if (payload && typeof payload === 'object' && 'id' in payload) {
    return String((payload as { id: unknown }).id ?? 'x');
  }
  return 'x';
}

function extractPatientName(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const p = payload as Record<string, unknown>;
  const name = typeof p.name === 'string' ? p.name : '';
  const family = typeof p.family === 'string' ? p.family : '';
  return [name, family].filter(Boolean).join(' ').trim();
}
