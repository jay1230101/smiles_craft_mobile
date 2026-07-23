import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

// React Query's "window focus" refetch is a browser concept — on React Native
// nothing reports focus unless we wire it up, so `refetchOnWindowFocus` is inert
// out of the box. Bridge it to AppState so coming back from the background
// counts as a focus event.
//
// Without this the app had no revalidation trigger at all: the tab screens stay
// mounted for the whole session, so `refetchOnMount` never fires again, and
// `refetchOnReconnect` needs an onlineManager binding we don't have either. The
// only things that could refresh a query were a socket event or a full restart —
// which is why data changed outside the app (or while the socket was down)
// stayed on screen until the user signed out and back in.
focusManager.setEventListener((handleFocus) => {
  const onChange = (state: AppStateStatus) => handleFocus(state === 'active');
  const sub = AppState.addEventListener('change', onChange);
  return () => sub.remove();
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      // Safe to leave on now that focus is bound to AppState: a refetch only
      // happens for queries whose staleTime has already lapsed, so foregrounding
      // costs one round trip on genuinely stale data rather than a full refresh.
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
