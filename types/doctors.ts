export type Doctor = {
  id: number;
  name: string;
  family: string;
};

// /getc_mapped returns the doctors the clinic owner has mapped to clinic
// rooms in Admin. The web calendar uses THIS list (not /clinic_doctors)
// for both the resource columns and the booking modal's doctor field.
export type MappedDoctor = {
  id: number;
  name: string;
};

export type GetMappedDoctorsResponse = {
  status: 'success' | 'error';
  data?: { clinic: string | number; doctor_id: number; doctor_name: string }[];
};

// Backend names sometimes already carry an honorific ("Dr Rami Hamdan"), so
// the guard matches "Dr" with an OPTIONAL period — otherwise we'd render
// "Dr. Dr Rami Hamdan". Kept in sync with formatDoctorName in lib/appointments.
export function doctorDisplayName(doctor: Doctor): string {
  const full = `${(doctor.name ?? '').trim()} ${(doctor.family ?? '').trim()}`.trim();
  if (!full) return 'Doctor';
  return /^Dr\.?\s/i.test(full) ? full : `Dr. ${full}`;
}

export function mappedDoctorDisplayName(doctor: MappedDoctor): string {
  const name = (doctor.name ?? '').trim();
  if (!name) return 'Doctor';
  return /^Dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
}
