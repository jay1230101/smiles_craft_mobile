export type NotificationKind =
  | 'newAppointment'
  | 'updateAppointment'
  | 'confirmedAppointment'
  | 'cancelledAppointment'
  | 'bookingDeleted'
  | 'patientAdded'
  | 'patientEdited'
  | 'patientDeleted'
  | 'info';

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  // Stored as ISO so React Native's serialization is stable across reloads.
  timestamp: string;
  read: boolean;
};
