export const endpoints = {
  auth: {
    login: '/login',
    logout: '/logout',
    forgotPassword: '/pass-token',
  },
  calendar: {
    list: '/getAllEvents',
  },
  patients: {
    list: '/getAllPatients',
    search: '/searchPatient',
  },
  bills: {
    pending: '/getPendingBills',
    all: '/getAllBills',
  },
} as const;
