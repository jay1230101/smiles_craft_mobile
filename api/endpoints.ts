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
    // POST /record-payment is not implemented on the backend yet — the
    // mobile cashier flow stubs against this path; once the route lands,
    // the contract is { patient_id, billID:[int], amountPaid, method? }.
    recordPayment: '/record-payment',
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
