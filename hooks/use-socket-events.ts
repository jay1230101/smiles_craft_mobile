import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';

import { connectSocket, disconnectSocket, type ServerEvent } from '@/api/socket';
import { DEMO_MODE, getMockNotifications } from '@/lib/mock-appointments';
import { useAuthStore } from '@/store/auth';
import { useNotificationsStore } from '@/store/notifications';
import type { BackendEvent } from '@/types/appointments';
import type { ChatThread, IncomingChatEvent } from '@/types/chats';
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
//   - removeFromBills -> a patient left it: charges cleared/deleted, or the
//                        last open charge for today was paid and discharged
// Mirrors the web's BillingContext. The billing tab also refetches on focus
// (app/(tabs)/billing.tsx), which covers anything that lands while the socket
// is disconnected. These are background list syncs, so they invalidate the
// cache but never raise a notification.
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

    // WhatsApp delivery-status changes (booking message + day-before reminder).
    // Patch the matching cached appointment in place rather than invalidating —
    // these fire several times per message (sent -> delivered -> read), so a
    // full /getAllEvents refetch per callback would be a refetch storm. No
    // notification is raised for these.
    const whatsappBookingHandler = (payload: unknown) => {
      const p = (payload ?? {}) as Record<string, unknown>;
      updateEventWhatsApp(queryClient, p.id, {
        isBookingWhatsappSent: !!p.bookingStatus,
        bookingApptStatus: (p.deliveryStatus as string | null) ?? null,
      });
    };
    const whatsappApptHandler = (payload: unknown) => {
      const p = (payload ?? {}) as Record<string, unknown>;
      updateEventWhatsApp(queryClient, p.id, {
        isAppointmentWhatsappSent: !!p.apptStatus,
        whatsappApptStatus: (p.apptdeliveryStatus as string | null) ?? null,
      });
    };
    socket.on('WhatsAppBookingStatus', whatsappBookingHandler);
    socket.on('WhatsAppApptStatus', whatsappApptHandler);

    // New inbound patient chat message: prepend it to the cached thread list so
    // the Patient Chats screen updates live. The home "new messages" badge is
    // derived from this cache vs. the persisted last-seen marker (see
    // store/chat-unread), so writing the cache is all that's needed here.
    const chatHandler = (payload: unknown) => {
      const evt = (payload ?? {}) as IncomingChatEvent;
      if (!evt.patient_phone) return;
      prependChatMessage(queryClient, evt);
    };
    socket.on('displayPatientWhatsApp', chatHandler);

    return () => {
      appointmentHandlers.forEach(({ event, handler }) => socket.off(event, handler));
      patientHandlers.forEach(({ event, handler }) => socket.off(event, handler));
      billingHandlers.forEach(({ event, handler }) => socket.off(event, handler));
      socket.off('WhatsAppBookingStatus', whatsappBookingHandler);
      socket.off('WhatsAppApptStatus', whatsappApptHandler);
      socket.off('displayPatientWhatsApp', chatHandler);
    };
  }, [token, status, queryClient, pushNotification]);
}

// Patch a cached appointment's WhatsApp status fields in place (matched on the
// booking id, exposed as extendedProps.mainId). Returns the same array when no
// row matched so React Query skips a needless re-render.
function updateEventWhatsApp(
  queryClient: QueryClient,
  id: unknown,
  patch: Partial<BackendEvent['extendedProps']>,
) {
  if (id == null) return;
  const target = String(id);
  queryClient.setQueryData<BackendEvent[]>(['appointments', 'all-events'], (old) => {
    if (!Array.isArray(old)) return old;
    let changed = false;
    const next = old.map((e) => {
      if (String(e.extendedProps?.mainId) === target || String(e.id) === target) {
        changed = true;
        return { ...e, extendedProps: { ...e.extendedProps, ...patch } };
      }
      return e;
    });
    return changed ? next : old;
  });
}

// Prepend an inbound chat message to the cached thread list (newest first) and
// move its thread to the top — mirrors the web. No-op when the list hasn't been
// fetched yet; the screen fetches fresh on open.
function prependChatMessage(queryClient: QueryClient, evt: IncomingChatEvent) {
  queryClient.setQueryData<ChatThread[]>(['chats'], (old) => {
    if (!Array.isArray(old)) return old;
    const msg = { message: evt.message, timestamp: evt.timestamp, direction: 'inbound' as const };
    const idx = old.findIndex((t) => t.patient_phone === evt.patient_phone);
    if (idx === -1) {
      const thread: ChatThread = {
        patient_phone: evt.patient_phone,
        patient_name: evt.patient_name,
        patient_id: evt.patient_id ?? null,
        clinic_call_number: evt.clinic_call_number ?? null,
        messages: [msg],
      };
      return [thread, ...old];
    }
    const existing = old[idx];
    const updated: ChatThread = { ...existing, messages: [msg, ...existing.messages] };
    return [updated, ...old.slice(0, idx), ...old.slice(idx + 1)];
  });
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
