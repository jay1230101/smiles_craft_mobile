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
