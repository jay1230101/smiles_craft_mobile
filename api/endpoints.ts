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
  clinic: {
    // For a non-systemadmin user this returns { clinicName, currency,
    // clinic_id } for their own clinic — the same call the web's billing
    // context uses to title receipts.
    info: '/getClinics',
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
    // /register-patient doubles as the edit route (pass registrationId); the
    // backend has no separate update endpoint. See api/patients.ts.
    register: '/register-patient',
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
  push: {
    // POST { token, platform: 'ios'|'android', deviceId? } → { status: 'success' }
    // Ships the current device's Expo push token to the backend so it can
    // reach us via /--/api/v2/push/send whenever an appointment changes.
    register: '/register-device-token',
    // POST { token } → { status: 'success' }
    // Cleans up on logout / permission revocation so we don't keep receiving
    // pushes for a session we've left.
    unregister: '/unregister-device-token',
  },
} as const;
