export const endpoints = {
  auth: {
    login: '/login',
    logout: '/logout',
    forgotPassword: '/pass-token',
  },
  calendar: {
    list: '/getAllEvents',
  },
  appointments: {
    cancellationReasons: '/cancellation-reasons',
    cancel: '/cancel-appt',
    encounter: '/encounter',
  },
  doctors: {
    list: '/get_doctors',
  },
  patients: {
    list: '/getAllPatients',
    search: '/searchPatient',
    register: '/register-patient',
  },
  genders: {
    list: '/getGender',
  },
  bills: {
    pending: '/getPendingBills',
    all: '/getAllBills',
  },
} as const;
