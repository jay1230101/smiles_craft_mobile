import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { connectSocket, disconnectSocket, type ServerEvent } from '@/api/socket';
import { DEMO_MODE } from '@/lib/mock-appointments';
import { useAuthStore } from '@/store/auth';

const APPOINTMENT_EVENTS: ServerEvent[] = [
  'newAppointment',
  'updateAppointment',
  'confirmedAppointment',
  'cancelledAppointment',
  'bookingDeleted',
];

export function useSocketEvents() {
  const token = useAuthStore((s) => s.token);
  const status = useAuthStore((s) => s.status);
  const queryClient = useQueryClient();

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

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'all-events'] });
    };

    APPOINTMENT_EVENTS.forEach((event) => socket.on(event, invalidate));

    return () => {
      APPOINTMENT_EVENTS.forEach((event) => socket.off(event, invalidate));
    };
  }, [token, status, queryClient]);
}
