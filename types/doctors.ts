export type Doctor = {
  id: number;
  name: string;
  family: string;
};

export function doctorDisplayName(doctor: Doctor): string {
  const full = `${(doctor.name ?? '').trim()} ${(doctor.family ?? '').trim()}`.trim();
  return full ? `Dr. ${full}` : 'Doctor';
}
