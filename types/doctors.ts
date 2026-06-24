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

export function doctorDisplayName(doctor: Doctor): string {
  const full = `${(doctor.name ?? '').trim()} ${(doctor.family ?? '').trim()}`.trim();
  return full ? `Dr. ${full}` : 'Doctor';
}

export function mappedDoctorDisplayName(doctor: MappedDoctor): string {
  const name = (doctor.name ?? '').trim();
  if (!name) return 'Doctor';
  return /^Dr\.\s/i.test(name) ? name : `Dr. ${name}`;
}
