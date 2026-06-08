export type CancellationReason = {
  id: number;
  reason: string;
};

export type CancelApptRequest = {
  patientId: number;
  bookingId: number;
  doctorId: number;
  reason: number;
};

export type CancelApptResponse = {
  status: 'success' | 'error';
  message: string;
};
