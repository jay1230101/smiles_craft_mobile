// Date/time and patient-display formatters shared by the New Appointment and
// Edit / Reschedule screens. These were previously copy-pasted byte-for-byte
// into both ~800-line screens; a fix to one copy (notably combineDateAndTime,
// which controls the tz-aware datetime the backend stores) silently left the
// other wrong. This is now the single source of truth.

export const DATE_REGEX = /^(\d{2})-(\d{2})-(\d{4})$/;
export const TIME_REGEX = /^(\d{2}):(\d{2})$/;

// Appointment date-picker bounds: ~2 years back to ~5 years forward.
export const APPOINTMENT_MIN_DATE = new Date(new Date().getFullYear() - 2, 0, 1);
export const APPOINTMENT_MAX_DATE = new Date(new Date().getFullYear() + 5, 11, 31);

export function ddMmYyyyToIso(value: string): string | null {
  const m = value.match(DATE_REGEX);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

// Emit an ISO 8601 string carrying the local timezone offset (e.g.
// "2026-06-22T14:00:00+03:00"), matching the web app's dayjs(...).format().
// The /encounter handler parses both naive and tz-aware, but WhatsApp template
// parameters are derived from the parsed datetime — sending a naive string
// replaces a tz-aware row with a naive one and shifts the displayed time by the
// local UTC offset the next time the calendar reads it.
export function combineDateAndTime(yyyymmdd: string, hhmm: string): string | null {
  const m = hhmm.match(TIME_REGEX);
  if (!m) return null;
  const [, hh, mm] = m;
  const dt = new Date(`${yyyymmdd}T${hh}:${mm}:00`);
  if (isNaN(dt.getTime())) return null;
  const offsetMin = -dt.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const offsetH = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, '0');
  const offsetM = String(Math.abs(offsetMin) % 60).padStart(2, '0');
  return `${yyyymmdd}T${hh}:${mm}:00${sign}${offsetH}:${offsetM}`;
}

export function parseTime(hhmm: string): number | null {
  const m = hhmm.match(TIME_REGEX);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function formatTimeMask(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

// Backend stores DOB as "DD-Month-YYYY" (e.g. "14-August-1990") but /encounter
// expects "YYYY-MM-DD". Accept either format and normalize to ISO.
export function normalizeDob(dob: string): string {
  if (!dob) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) return dob;
  const parts = dob.split('-');
  if (parts.length !== 3) return dob;
  const [dd, monthName, yyyy] = parts;
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const idx = months.findIndex((m) => m.toLowerCase() === monthName.toLowerCase());
  if (idx < 0) return dob;
  return `${yyyy}-${String(idx + 1).padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

// Display DOB as DD-MM-YYYY, accepting either "DD-Month-YYYY" or "YYYY-MM-DD".
export function formatDobDisplay(dob: string): string {
  if (!dob) return '';
  const iso = normalizeDob(dob);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [yyyy, mm, dd] = iso.split('-');
    return `${dd}-${mm}-${yyyy}`;
  }
  return dob;
}

export function ensureLeadingPlus(phone: string): string {
  const trimmed = (phone ?? '').trim();
  if (!trimmed) return '';
  return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
}
