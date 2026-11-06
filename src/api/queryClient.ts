import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Pas de nouvelle tentative sur un refus du serveur (4xx) : seules les pannes
      // réseau et les erreurs 5xx méritent d'être retentées, et au plus deux fois.
      retry: (failureCount, error) => {
        const retryable =
          error instanceof ApiError && (error.isNetworkError || error.status >= 500);
        return retryable && failureCount < 2;
      },
    },
  },
});
