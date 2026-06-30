export const endpoints = {
  auth: {
    login: '/login',
    logout: '/logout',
    forgotPassword: '/pass-token',
  },
  calendar: {
    list: '/getAllEvents',
    schedule: '/getClinicSchedule',
  },
  appointments: {
    cancellationReasons: '/cancellation-reasons',
    cancel: '/cancel-appt',
    encounter: '/encounter',
  },
  doctors: {
    list: '/clinic_doctors',
    mapped: '/getc_mapped',
  },
  patients: {
    list: '/registeredPatients',
    search: '/search-patient',
    register: '/register-patient',
    update: '/update-patient',
    delete: '/delete_patient',
  },
  genders: {
    list: '/getGender',
  },
  bills: {
    pending: '/getPendingBills',
    all: '/getAllBills',
    current: '/getCurrentBills',
    detail: (patientId: number | string) => `/bill/${patientId}`,
    history: (patientId: number | string) => `/patient/${patientId}/billing`,
    // Payment recording goes through orders.submit (/treatment-plan) with
    // empty inProcessStatus + procedures arrays so only the payment block
    // on the backend runs — same primitive the web uses today.
  },
  reports: {
    list: '/getReports',
    data: '/reports',
    periods: '/getPeriods',
  },
  orders: {
    init: '/init-procedure-screen',
    pending: '/getPendingProcedures',
    submit: '/treatment-plan',
    visits: '/getVisitsHistory',
  },
  planOfCare: {
    save: '/planOfCare',
    list: '/get-plan-care',
  },
  reminders: {
    templates: '/getActiveTemplates',
    store: '/store_reminders',
  },
} as const;
