import { useQuery } from '@tanstack/react-query';
import type { Href } from 'expo-router';

import { getAuthorizedPagesRequest } from '@/api/access';
import { DEMO_MODE } from '@/lib/mock-appointments';
import { useAuthStore } from '@/store/auth';
import type { AuthorizedPages, MobilePageKey } from '@/types/access';

export const AUTHORIZED_PAGES_KEY = ['authorized-pages'] as const;

// Pages the backend always hides from non-owner doctors (apply_doctor_restrictions).
// The loaded map already encodes this; we also enforce it as a floor so a failed
// or missing map can never re-expose one of these to a restricted doctor. Only
// `financial_reports` has a mobile surface (the Reports tab).
const DOCTOR_RESTRICTED: MobilePageKey[] = ['financial_reports'];

// Tab order matches the tab bar. Each mobile tab maps to the backend page key
// the web gates the same screen on, plus the expo-router href to navigate to.
export const TAB_PAGES: { key: MobilePageKey; href: Href }[] = [
  { key: 'dashboard', href: '/(tabs)/(home)' },
  { key: 'register_patient', href: '/(tabs)/register' },
  { key: 'calendar', href: '/(tabs)/calendar' },
  { key: 'billing', href: '/(tabs)/billing' },
  { key: 'financial_reports', href: '/reports' },
];

function isAllowed(pages: AuthorizedPages | undefined, key: string): boolean {
  // No map yet (loading / error / clinic has no roles configured / demo) ->
  // fail open so a transient error never locks a legitimate user out. Once the
  // map loads it is authoritative: only an explicit 1/true grants access.
  if (!pages) return true;
  const v = pages[key];
  return v === 1 || v === true;
}

// Page permissions for the signed-in user. Cached for the session (permissions
// change rarely and only from the web admin); a fresh login clears the cache.
export function useAuthorizedPages() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const query = useQuery({
    queryKey: AUTHORIZED_PAGES_KEY,
    queryFn: getAuthorizedPagesRequest,
    enabled: !DEMO_MODE && status === 'authenticated',
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const isRestrictedDoctor = user?.role === 'DOCTOR' && !user?.is_owner;

  const can = (key: MobilePageKey): boolean => {
    // Enforce the non-owner-doctor floor when the map isn't available, so a
    // transient failure never re-exposes Reports. When the map loaded it
    // already encodes this, so we just read it.
    if (!query.data && isRestrictedDoctor && DOCTOR_RESTRICTED.includes(key)) {
      return false;
    }
    return isAllowed(query.data, key);
  };

  // First tab the user is allowed to see, used to land restricted users
  // somewhere valid when their default (Home) is off. null = no tab allowed.
  const firstAllowedTab = (): Href | null => {
    const match = TAB_PAGES.find((t) => can(t.key));
    return match ? match.href : null;
  };

  return {
    pages: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    can,
    firstAllowedTab,
  };
}
