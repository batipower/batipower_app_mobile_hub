import { AppState } from 'react-native';
import { focusManager, QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';

// React Native n'a pas d'événement « focus de fenêtre » : on s'appuie sur l'état de
// l'app. Au retour au premier plan, les requêtes périmées sont rechargées ; en
// arrière-plan, les rafraîchissements automatiques (`refetchInterval`) sont suspendus.
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (status) => {
    handleFocus(status === 'active');
  });
  return () => subscription.remove();
});

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
