// Per-role page permissions, mirroring the web app. The backend's Access table
// has one 0/1 column per page; `GET /getAuthorizedPages` returns them as a map
// for the logged-in user's role + clinic, with non-owner-doctor restrictions
// already applied server-side. The clinic admin edits these on the web; the
// mobile app only reads them so the same access shows up on the phone.

// The page keys the mobile app actually gates on. The backend returns more
// (stock, expenses, dues, ai_scan, admin_general, …) that have no mobile
// surface yet, so we only name the ones we use.
export type MobilePageKey =
  | 'dashboard'
  | 'register_patient'
  | 'calendar'
  | 'billing'
  | 'financial_reports'
  | 'patient_chats'
  | 'documentation';

// Raw response: every page -> 0 | 1 (sometimes true/false). Unknown keys are
// tolerated so a backend addition never breaks the parse.
export type AuthorizedPages = Record<string, number | boolean>;
