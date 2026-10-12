import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import { getPatientsRequest, type PatientsPage } from '@/api/patients';
import { demoPatientStore } from '@/lib/demo-patient-store';
import { DEMO_MODE } from '@/lib/mock-appointments';

const PER_PAGE = 50;

// The backend paginates /registeredPatients (50/page) and searches server-side,
// so the list is an infinite query: page 1 on open, more pages as the user
// scrolls, and a fresh query whenever the (debounced) search term changes.
export function usePatients(search: string) {
  return useInfiniteQuery({
    queryKey: ['patients', 'list', search],
    initialPageParam: 1,
    queryFn: ({ pageParam }): Promise<PatientsPage> => {
      if (DEMO_MODE) {
        // Demo has a small in-memory store — return it all as a single page,
        // filtered client-side so the search box still works offline.
        const q = search.trim().toLowerCase();
        const all = demoPatientStore.list().filter((p) => {
          if (!q) return true;
          return [p.name, p.family, p.phone, p.doctor_name]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(q);
        });
        return Promise.resolve({ patients: all, total: all.length, page: 1, perPage: all.length });
      }
      return getPatientsRequest({ page: pageParam, perPage: PER_PAGE, search });
    },
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.perPage < lastPage.total ? lastPage.page + 1 : undefined,
    // Keep the current results on screen while a new search term loads, so the
    // list doesn't flash to a spinner on every keystroke.
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}
