import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { adminApiKeysApi } from '@/api/adminPlatform';
import { errorMessage } from '@/features/preparation/components/ListState';

import { ADMIN_API_KEYS_PENDING_COUNT_KEY, ADMIN_API_KEYS_ROOT_KEY } from '../../queryKeys';

/** Invalide toute la famille des clés API et le compteur de demandes (badge de l'onglet). */
export function useInvalidateApiKeys() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ADMIN_API_KEYS_ROOT_KEY }),
      queryClient.invalidateQueries({ queryKey: ADMIN_API_KEYS_PENDING_COUNT_KEY }),
    ]);
}

/** Activation / désactivation et suppression d'une clé, depuis la liste. */
export function useApiKeyListActions() {
  const invalidate = useInvalidateApiKeys();

  const toggle = useMutation({
    mutationFn: ({ apiKey, active }: { apiKey: string; active: boolean }) =>
      active ? adminApiKeysApi.activate(apiKey) : adminApiKeysApi.deactivate(apiKey),
    onSuccess: async (_d, vars) => {
      toast.success(vars.active ? 'Clé activée' : 'Clé désactivée');
      await invalidate();
    },
    onError: (e) => toast.error(errorMessage(e, 'Erreur lors de la modification')),
  });

  const remove = useMutation({
    mutationFn: (apiKey: string) => adminApiKeysApi.deleteConfig(apiKey),
    onSuccess: async () => {
      toast.success('Clé API supprimée');
      await invalidate();
    },
    onError: (e) => toast.error(errorMessage(e, 'Erreur lors de la suppression')),
  });

  return { toggle, remove };
}
