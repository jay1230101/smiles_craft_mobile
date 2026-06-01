export const endpoints = {
  auth: {
    login: '/login',
    logout: '/logout',
    forgotPassword: '/forgot-password',
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
