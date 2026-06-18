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
    search: '/search-patient',
    register: '/register-patient',
    update: '/update-patient',
    delete: '/delete-patient',
  },
  genders: {
    list: '/getGender',
  },
  bills: {
    pending: '/getPendingBills',
    all: '/getAllBills',
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
