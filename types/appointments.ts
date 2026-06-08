export type BackendEvent = {
  start: string;
  end: string;
  id: number | string;
  dob: string | null;
  phone: string | null;
  name: string;
  family: string;
  doctor: string;
  visit_date: string;
  resourceId: number;
  patientId: number;
  extendedProps: {
    procedure: string | null;
    isBookingWhatsappSent: boolean;
    isAppointmentWhatsappSent: boolean;
    isAppointmentConfirmed: boolean;
    isAppointmentCancelled: boolean;
    mainId: number;
  };
};

export type GetAllEventsResponse = {
  status: 'success' | 'error';
  data: BackendEvent[];
  message?: string;
};

// POST /encounter is multi-purpose: it handles new bookings, edits/reschedules,
// and deletes. For the mobile Edit / Reschedule flow we send `eventId` (the
// existing encounter_id) so the backend takes the UPDATE path.
export type UpdateAppointmentRequest = {
  eventId: string | number;
  name: string;
  family: string;
  dob: string;          // YYYY-MM-DD
  phone: string;
  date: string;         // YYYY-MM-DD
  start_iso: string;    // ISO datetime
  end_iso: string;      // ISO datetime
  proc: string;
  resourceId: number;   // doctor_id
  doctor_name: string;
  booking_reminder: boolean;
};

export type UpdateAppointmentResponse = {
  status: 'success' | 'unavailable' | 'error';
  message: string;
};
