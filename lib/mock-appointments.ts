import type { AppointmentStatus } from '@/components/status-pill';
import type { BackendEvent } from '@/types/appointments';
import type { Doctor } from '@/types/doctors';
import { todayYMD, type SummaryCounts } from './appointments';

export const MOCK_DOCTORS: Doctor[] = [
  { id: 1, name: 'Sarah', family: 'Mitchell' },
  { id: 2, name: 'Charbel', family: 'Diab' },
  { id: 3, name: 'James', family: 'Parker' },
  { id: 4, name: 'Eli', family: 'Shamlos' },
];

// Flip to `false` to use live backend data on Dashboard + All Appointments + Calendar.
export const DEMO_MODE = true;

function mockEvent(opts: {
  mainId: number;
  doctorId: number;
  name: string;
  family: string;
  doctor: string;
  startHour: number;
  startMinute?: number;
  endHour: number;
  endMinute?: number;
  procedure: string;
  confirmed?: boolean;
  cancelled?: boolean;
}): BackendEvent {
  const today = todayYMD();
  const startMm = String(opts.startMinute ?? 0).padStart(2, '0');
  const startHh = String(opts.startHour).padStart(2, '0');
  const endMm = String(opts.endMinute ?? 0).padStart(2, '0');
  const endHh = String(opts.endHour).padStart(2, '0');
  return {
    start: `${today}T${startHh}:${startMm}:00`,
    end: `${today}T${endHh}:${endMm}:00`,
    id: opts.mainId,
    dob: null,
    phone: null,
    name: opts.name,
    family: opts.family,
    doctor: opts.doctor,
    visit_date: today,
    resourceId: opts.doctorId,
    patientId: opts.mainId,
    extendedProps: {
      procedure: opts.procedure,
      isBookingWhatsappSent: false,
      isAppointmentWhatsappSent: false,
      isAppointmentConfirmed: opts.confirmed ?? false,
      isAppointmentCancelled: opts.cancelled ?? false,
      mainId: opts.mainId,
    },
  };
}

export function getMockCalendarEvents(): BackendEvent[] {
  return [
    mockEvent({
      mainId: 101,
      doctorId: 1,
      name: 'Emily',
      family: 'Rodriguez',
      doctor: 'Sarah Mitchell',
      startHour: 9,
      endHour: 10,
      procedure: 'Dental Cleaning',
      confirmed: true,
    }),
    mockEvent({
      mainId: 102,
      doctorId: 1,
      name: 'Sarah',
      family: 'Wilson',
      doctor: 'Sarah Mitchell',
      startHour: 10,
      endHour: 10,
      endMinute: 30,
      procedure: 'Consultation',
    }),
    mockEvent({
      mainId: 103,
      doctorId: 2,
      name: 'Johny',
      family: 'Achkar',
      doctor: 'Charbel Diab',
      startHour: 11,
      endHour: 12,
      procedure: 'Root Canal',
      confirmed: true,
    }),
    mockEvent({
      mainId: 104,
      doctorId: 3,
      name: 'Michael',
      family: 'Chen',
      doctor: 'James Parker',
      startHour: 14,
      endHour: 15,
      procedure: 'Crown Fitting',
      confirmed: true,
    }),
  ];
}

export type MockAppointment = {
  id: string;
  initials: string;
  name: string;
  time: string;
  treatment: string;
  doctor: string;
  status: AppointmentStatus;
};

export const MOCK_APPOINTMENTS: MockAppointment[] = [
  {
    id: '1',
    initials: 'MC',
    name: 'Michael Chen',
    time: '10:30 AM',
    treatment: 'Dental Cleaning & Check-up',
    doctor: 'Dr. Sarah Mitchell',
    status: 'unconfirmed',
  },
  {
    id: '2',
    initials: 'ER',
    name: 'Emily Rodriguez',
    time: '9:00 AM',
    treatment: 'Root Canal Treatment',
    doctor: 'Dr. Sarah Mitchell',
    status: 'cancelled',
  },
  {
    id: '3',
    initials: 'JW',
    name: 'Jessica Williams',
    time: '11:45 PM',
    treatment: 'Consultation',
    doctor: 'Dr. Eli Shamlos',
    status: 'confirmed',
  },
  {
    id: '4',
    initials: 'DT',
    name: 'David Thompson',
    time: '2:00 PM',
    treatment: 'Teeth Cleaning',
    doctor: 'Dr. Sarah Mitchell',
    status: 'confirmed',
  },
  {
    id: '5',
    initials: 'SJ',
    name: 'Sarah Johnson',
    time: '3:00 PM',
    treatment: 'Crown Fitting',
    doctor: 'Dr. Sarah Mitchell',
    status: 'confirmed',
  },
];

export const MOCK_SUMMARY: SummaryCounts = {
  confirmed: 18,
  cancelled: 4,
  unconfirmed: 3,
  // Total = confirmed + unconfirmed (cancelled excluded; shown in its own card).
  total: 21,
};
