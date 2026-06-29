import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import { DEMO_MODE } from '@/lib/mock-appointments';

export type ClinicSchedule = {
  // Slot duration in minutes (15, 20, 30, 60...).
  slotMinutes: number;
  // Day window expressed in 24h hours (08, 18).
  startHour: number;
  endHour: number;
  hiddenDays: number[];
};

// Backend shape: { slotDuration: "00:30:00", startTime: "08:00", endTime: "18:00", hiddenDays: [0,6], workingDays: "1,2,3,4,5" }
type RawSchedule = {
  slotDuration?: string;
  startTime?: string;
  endTime?: string;
  hiddenDays?: number[];
  workingDays?: string;
};

// Live-mode fallback when /getClinicSchedule fails or returns malformed
// data. Keep this conservative (60-min slots) so we never accidentally
// over-subdivide a clinic that's actually configured for hourly slots.
const DEFAULT_SCHEDULE: ClinicSchedule = {
  slotMinutes: 60,
  startHour: 8,
  endHour: 18,
  hiddenDays: [],
};

// Demo-mode schedule mirrors what most of our test clinics use (30-min
// slots) so the calendar in development matches what the live build will
// render for clinics like Mireille's. Without this the demo build looks
// like nothing changed.
const DEMO_SCHEDULE: ClinicSchedule = {
  slotMinutes: 30,
  startHour: 8,
  endHour: 18,
  hiddenDays: [],
};

function parseSlotMinutes(slotDuration: string | undefined): number {
  if (!slotDuration) return DEFAULT_SCHEDULE.slotMinutes;
  const m = slotDuration.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (!m) return DEFAULT_SCHEDULE.slotMinutes;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const total = hh * 60 + mm;
  return total > 0 ? total : DEFAULT_SCHEDULE.slotMinutes;
}

function parseHour(time: string | undefined, fallback: number): number {
  if (!time) return fallback;
  const m = time.match(/^(\d{1,2})/);
  if (!m) return fallback;
  const h = Number(m[1]);
  return h >= 0 && h <= 24 ? h : fallback;
}

function normalize(raw: RawSchedule | null | undefined): ClinicSchedule {
  if (!raw) return DEFAULT_SCHEDULE;
  return {
    slotMinutes: parseSlotMinutes(raw.slotDuration),
    startHour: parseHour(raw.startTime, DEFAULT_SCHEDULE.startHour),
    endHour: parseHour(raw.endTime, DEFAULT_SCHEDULE.endHour),
    hiddenDays: Array.isArray(raw.hiddenDays) ? raw.hiddenDays : [],
  };
}

export function useClinicSchedule() {
  return useQuery<ClinicSchedule>({
    queryKey: ['calendar', 'schedule'],
    queryFn: async () => {
      if (DEMO_MODE) return DEMO_SCHEDULE;
      const { data } = await apiClient.get<RawSchedule>(endpoints.calendar.schedule);
      return normalize(data);
    },
    staleTime: 10 * 60 * 1000,
    placeholderData: DEMO_MODE ? DEMO_SCHEDULE : DEFAULT_SCHEDULE,
  });
}
