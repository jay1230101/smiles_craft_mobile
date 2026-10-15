import { apiClient } from './client';
import { endpoints } from './endpoints';
import type { AuthorizedPages } from '@/types/access';

// Fetch the logged-in user's page permissions. Returns the raw { page: 0|1 }
// map. A clinic that has never configured roles makes the backend answer 400
// ("Clinic is not available"); the caller treats that (and any error) as
// "no restrictions configured" and falls back to the default role behavior.
export async function getAuthorizedPagesRequest(): Promise<AuthorizedPages> {
  const { data } = await apiClient.get<AuthorizedPages>(endpoints.access.authorizedPages);
  return data ?? {};
}
