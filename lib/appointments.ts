import type { AppointmentStatus } from '@/components/status-pill';
import type { BackendEvent } from '@/types/appointments';

export type AppointmentItem = {
  id: string;
  initials: string;
  name: string;
  time: string;
  treatment: string;
  doctor: string;
  status: AppointmentStatus;
};

export type SummaryCounts = {
  confirmed: number;
  cancelled: number;
  unconfirmed: number;
  total: number;
};

export function todayYMD(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function deriveStatus(event: BackendEvent): AppointmentStatus {
  const ext = event.extendedProps ?? ({} as BackendEvent['extendedProps']);
  if (ext.isAppointmentCancelled) return 'cancelled';
  if (ext.isAppointmentConfirmed) return 'confirmed';
  return 'unconfirmed';
}

export function formatEventTime(start: string | null | undefined): string {
  if (!start) return '';
  const d = new Date(start);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  const m = start.match(/^(\d{1,2}):(\d{2})/);
  if (m) {
    const hour = parseInt(m[1], 10);
    const minute = m[2];
    const period = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${minute} ${period}`;
  }
  return start;
}

export function formatInitials(name?: string, family?: string): string {
  const n = (name ?? '').trim();
  const f = (family ?? '').trim();
  if (n && f) return (n[0] + f[0]).toUpperCase();
  if (n) return n.slice(0, 2).toUpperCase();
  return '?';
}

export function eventToAppointmentItem(event: BackendEvent): AppointmentItem {
  const fullName = `${(event.name ?? '').trim()} ${(event.family ?? '').trim()}`.trim();
  const doctor = event.doctor ? `Dr. ${event.doctor}` : '';
  return {
    id: String(event.extendedProps?.mainId ?? event.id),
    initials: formatInitials(event.name, event.family),
    name: fullName || 'Unknown',
    time: formatEventTime(event.start),
    treatment: event.extendedProps?.procedure ?? '',
    doctor,
    status: deriveStatus(event),
  };
}

export function eventsForDate(events: BackendEvent[], ymd: string): BackendEvent[] {
  return events.filter((e) => e.visit_date === ymd);
}

export function summarize(events: BackendEvent[], ymd: string): SummaryCounts {
  const todays = eventsForDate(events, ymd);
  const counts: SummaryCounts = { confirmed: 0, cancelled: 0, unconfirmed: 0, total: todays.length };
  for (const e of todays) {
    const s = deriveStatus(e);
    if (s === 'confirmed') counts.confirmed += 1;
    else if (s === 'cancelled') counts.cancelled += 1;
    else counts.unconfirmed += 1;
  }
  return counts;
}

export function sortAppointmentsByTime(items: AppointmentItem[]): AppointmentItem[] {
  return [...items].sort((a, b) => a.time.localeCompare(b.time));
}
