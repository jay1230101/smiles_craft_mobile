import { z } from 'zod';

// Shared patient registration / edit form schema. patient-register.tsx and
// patient-edit.tsx previously each carried a byte-identical copy of this
// schema, its DOB/phone regexes, and the DOB->backend converter; a change to
// one copy silently left the other on the old rules. This is now the single
// source of truth for both.

const DOB_REGEX = /^(\d{2})-(\d{2})-(\d{4})$/;
const DIGITS_ONLY = /^[0-9]+$/;

// Name, Family, Phone, Clinician are required; the rest is optional.
export const patientSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  family: z.string().trim().min(1, 'Family name is required'),
  dob: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || DOB_REGEX.test(v), 'Use format DD-MM-YYYY')
    .refine((v) => {
      if (!v) return true;
      const match = v.match(DOB_REGEX);
      if (!match) return false;
      const [, dd, mm, yyyy] = match;
      const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
      return (
        !isNaN(d.getTime()) &&
        d.getDate() === Number(dd) &&
        d.getMonth() + 1 === Number(mm) &&
        d.getFullYear() === Number(yyyy) &&
        d.getTime() < Date.now()
      );
    }, 'Enter a real past date'),
  phone: z
    .string()
    .trim()
    .min(6, 'Phone is required')
    .regex(DIGITS_ONLY, 'Digits only, no spaces or symbols'),
  gender: z.string().trim().optional(),
  doctor: z.number().int().positive('Clinician is required'),
  allergy: z.string().trim().optional(),
});

export type PatientFormValues = z.infer<typeof patientSchema>;

// "DD-MM-YYYY" -> "YYYY-MM-DD" for the backend; passthrough if unparseable.
export function dobToBackend(input: string): string {
  const m = input.match(DOB_REGEX);
  if (!m) return input;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}
