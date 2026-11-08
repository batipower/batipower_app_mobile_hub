import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { adminAccountsApi } from '@/api/adminAccounts';
import { errorMessage } from '@/features/preparation/components/ListState';
import type { UpdateUserPayload, VacationMode } from '@/types/admin';

import { ADMIN_USERS_KEY, ADMIN_VACATION_CONFIG_KEY } from '../../queryKeys';

/** Tous les comptes (le web filtre côté client : une seule requête, sans pagination). */
export function useAdminUsers() {
  return useQuery({
    queryKey: ADMIN_USERS_KEY,
    queryFn: () => adminAccountsApi.listUsers(),
  });
}

/** Un compte de la liste en cache (fiche et édition lisent la même requête que la liste). */
export function useAdminUser(id: string | undefined) {
  const query = useAdminUsers();
  return { ...query, user: id ? query.data?.find((u) => u.id === id) : undefined };
}

export function useVacationMode() {
  return useQuery({
    queryKey: ADMIN_VACATION_CONFIG_KEY,
    queryFn: () => adminAccountsApi.getVacationConfig(),
  });
}

/** Actions rapides d'une fiche : activer / désactiver, vacances, déblocage. Chacune rafraîchit la liste. */
export function useUserQuickActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserPayload; message: string }) =>
      adminAccountsApi.updateUser(id, data),
    onSuccess: async (_user, vars) => {
      toast.success(vars.message);
      await refresh();
    },
    onError: (error) => toast.error(errorMessage(error, 'Mise à jour impossible')),
  });

  const unlock = useMutation({
    mutationFn: (id: string) => adminAccountsApi.unlockUser(id),
    onSuccess: async () => {
      toast.success('Compte débloqué');
      await refresh();
    },
    onError: (error) => toast.error(errorMessage(error, 'Impossible de débloquer le compte')),
  });

  const vacationMode = useMutation({
    mutationFn: (mode: VacationMode) => adminAccountsApi.updateVacationConfig(mode),
    onSuccess: async (res) => {
      toast.success(res.mode === 'AUTOMATIC' ? 'Mode automatique activé' : 'Mode manuel activé');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_VACATION_CONFIG_KEY }),
        refresh(),
      ]);
    },
    onError: (error) => toast.error(errorMessage(error, 'Changement de mode impossible')),
  });

  return { update, unlock, vacationMode };
}
