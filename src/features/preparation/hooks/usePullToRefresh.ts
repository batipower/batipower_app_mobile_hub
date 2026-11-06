import { useCallback, useState } from 'react';

/**
 * État du « tirer pour rafraîchir ». Géré à part de `isFetching` : l'actualisation
 * automatique en arrière-plan ne doit pas faire apparaître le spinner.
 */
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return { refreshing, onRefresh };
}
