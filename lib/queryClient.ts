/**
 * React Query Client Configuration
 *
 * This file sets up TanStack Query (React Query) for:
 * - Automatic caching and background refetching
 * - Stale-while-revalidate pattern (show cached data instantly, update in background)
 * - Retry logic for failed requests
 * - Garbage collection of unused data
 *
 * WHY: Makes the app feel instant by showing cached data immediately
 * while fetching fresh data in the background (like Instagram/WhatsApp)
 */

import { QueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes before considering it stale
      staleTime: 1000 * 60 * 5, // 5 minutes

      // Keep unused data in cache for 10 minutes before garbage collection
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)

      // Retry failed requests 2 times with exponential backoff
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on window focus (when user returns to app)
      refetchOnWindowFocus: true,

      // Refetch when network reconnects
      refetchOnReconnect: true,

      // Don't refetch on mount if data is fresh
      refetchOnMount: false,

      // Network mode: online-first, fallback to cache when offline
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});

/**
 * Prefetch data on app start for instant loading
 * Call this from _layout.tsx after auth is initialized
 */
export async function prefetchCriticalData(userId: string) {
  // Only prefetch if online
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return;

  // Prefetch user profile, notifications, etc.
  // This makes the app feel instant on first load
  try {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['profile', userId],
        queryFn: () => import('@/lib/supabase').then(m =>
          m.supabase.from('profiles').select('*').eq('id', userId).single()
        ),
      }),
      queryClient.prefetchQuery({
        queryKey: ['notifications', userId],
        queryFn: () => import('@/lib/supabase').then(m =>
          m.supabase.from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20)
        ),
      }),
    ]);
  } catch (error) {
    console.warn('Prefetch failed:', error);
  }
}

/**
 * Clear all cached data (useful for logout)
 */
export function clearAllCache() {
  queryClient.clear();
}
