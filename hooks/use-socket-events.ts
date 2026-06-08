import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { connectSocket, disconnectSocket, type ServerEvent } from '@/api/socket';
import { DEMO_MODE, getMockNotifications } from '@/lib/mock-appointments';
import { useAuthStore } from '@/store/auth';
import { useNotificationsStore } from '@/store/notifications';
import type { NotificationKind } from '@/types/notifications';

const APPOINTMENT_EVENTS: ServerEvent[] = [
  'newAppointment',
  'updateAppointment',
  'confirmedAppointment',
  'cancelledAppointment',
  'bookingDeleted',
];

const PATIENT_EVENTS: ServerEvent[] = ['patientAdded', 'patientEdited', 'patientDeleted'];

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

    const makeAppointmentHandler = (event: ServerEvent) => (payload: unknown) => {
      invalidateAppointments();
      pushNotification(buildNotification(event, payload));
    };
    const makePatientHandler = (event: ServerEvent) => (payload: unknown) => {
      invalidatePatients();
      pushNotification(buildNotification(event, payload));
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

    return () => {
      appointmentHandlers.forEach(({ event, handler }) => socket.off(event, handler));
      patientHandlers.forEach(({ event, handler }) => socket.off(event, handler));
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
  switch (event) {
    case 'newAppointment':
      return { title: 'New appointment', body: name ? `Booked for ${name}.` : 'A new appointment has been booked.' };
    case 'updateAppointment':
      return { title: 'Appointment updated', body: name ? `${name}'s appointment was updated.` : 'An appointment was updated.' };
    case 'confirmedAppointment':
      return { title: 'Appointment confirmed', body: name ? `${name} confirmed their appointment.` : 'Appointment confirmed.' };
    case 'cancelledAppointment':
      return { title: 'Appointment cancelled', body: name ? `${name}'s appointment was cancelled.` : 'An appointment was cancelled.' };
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
