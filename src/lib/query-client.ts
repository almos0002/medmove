import { QueryClient } from '@tanstack/react-query'

/**
 * Browser-side QueryClient.
 *
 * Notes:
 *  - We do **not** use TanStack Query for SSR data — initial reads happen
 *    in route `loader`s (which are server-aware and SSR-rendered). React
 *    Query is used only for client-side mutations and ad-hoc refetches.
 *  - After a successful mutation, callers should invalidate via
 *    `router.invalidate()` so the loaders re-run, rather than juggling
 *    query keys.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  })
}
