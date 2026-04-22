import { useQuery } from '@tanstack/react-query';
import { analyticsApi, type PublicAnalyticsSummary } from '../lib/api';

/**
 * Shared React Query hook for the public `/analytics/summary` endpoint.
 *
 * Key is the same as the StatsPanel on the Dashboard (`['analytics', 'summary']`)
 * so the cache is shared — a user who lands on `/` and then navigates to
 * `/dashboard` reuses the data without a second network round trip.
 *
 * - Server caches the response for 60 s (Redis).
 * - Client considers data fresh for 60 s, and refetches every 90 s so the
 *   numbers stay within ~30 s of server-side truth without hammering.
 * - No auth required; the endpoint is public. Safe for the landing page's
 *   pre-sign-in state.
 */
export function usePublicMetrics() {
  return useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: async () => {
      const res = await analyticsApi.summary();
      return res.data;
    },
    staleTime: 60_000,
    refetchInterval: 90_000,
  });
}

export type { PublicAnalyticsSummary };
