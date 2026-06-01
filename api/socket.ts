import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from './client';

export type ServerEvent =
  | 'newAppointment'
  | 'updateAppointment'
  | 'confirmedAppointment'
  | 'cancelledAppointment'
  | 'patientAdded'
  | 'patientEdited'
  | 'patientDeleted'
  | 'bookingDeleted'
  | 'updateBills'
  | 'getPendingBills'
  | 'editedUser'
  | 'getAddUsers';

let socket: Socket | null = null;
let currentToken: string | null = null;

export function connectSocket(token: string): Socket {
  if (socket && currentToken === token) {
    return socket;
  }
  disconnectSocket();
  currentToken = token;
  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  currentToken = null;
}

export function getSocket(): Socket | null {
  return socket;
}
