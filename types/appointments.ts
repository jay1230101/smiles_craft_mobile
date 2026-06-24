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

// POST /encounter doubles as delete when given { eventToDelete: <bookingId> }.
// The web modal sends `data.eventId` (the mainId) as the value. Mobile follows
// the same shape so the backend takes its existing delete branch.
export type DeleteAppointmentRequest = {
  eventToDelete: number | string;
};

export type DeleteAppointmentResponse = {
  status: 'deleted' | 'error';
  message: string;
};

// /encounter takes the SAME payload shape for create vs update. The
// difference is `eventId`: a fresh UUID = new booking (backend takes the
// "first time encounter" branch since no row matches), an existing
// encounter_id = update. We MUST send a fresh UUID on create — sending
// none means the backend matches the first row with NULL encounter_id
// and silently overwrites it.
export type CreateAppointmentRequest = {
  eventId: string;
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

export type CreateAppointmentResponse = {
  status: 'success' | 'unavailable' | 'error';
  message: string;
};
