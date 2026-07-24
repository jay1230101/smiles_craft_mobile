import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import { DEMO_MODE } from '@/lib/mock-appointments';

export type ClinicInfo = {
  clinicName: string;
  currency: string;
};

// Product name to fall back to before /getClinics resolves, or if it fails.
// Deliberately NOT "Smiles Craft Dental Clinic" — the clinic name is what
// belongs on a patient-facing receipt; this is only a placeholder.
const FALLBACK: ClinicInfo = { clinicName: 'Smiles Craft', currency: 'USD' };

// Backend /getClinics for a non-systemadmin returns { clinicName, currency,
// clinic_id } for the caller's own clinic (views.py). We only need the name
// and currency here.
type RawClinicInfo = {
  clinicName?: string | null;
  currency?: string | null;
};

// The clinic name titles the payment receipt (screen + shared PDF). It changes
// about never, so cache it hard and lean on the fallback until it lands.
export function useClinicInfo() {
  return useQuery<ClinicInfo>({
    queryKey: ['clinic', 'info'],
    queryFn: async () => {
      if (DEMO_MODE) return FALLBACK;
      const { data } = await apiClient.get<RawClinicInfo>(endpoints.clinic.info);
      const name = (data?.clinicName ?? '').trim();
      return {
        clinicName: name || FALLBACK.clinicName,
        currency: (data?.currency ?? '').trim() || FALLBACK.currency,
      };
    },
    staleTime: 60 * 60 * 1000,
    placeholderData: FALLBACK,
  });
}
