import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { adminPartnersApi } from '@/api/adminPartners';
import { errorMessage } from '@/features/preparation/components/ListState';
import type { UpdateWarehouseConfigInput } from '@/types/adminPartners';

import { adminWarehouseConfigKey } from '../../queryKeys';

/** Configuration effective d'un entrepôt (flux eBatPro, palette, agences proches). */
export function useWarehouseConfig(distributorId: string, warehouseId: string) {
  return useQuery({
    queryKey: adminWarehouseConfigKey(distributorId, warehouseId),
    queryFn: () => adminPartnersApi.getWarehouseConfig(distributorId, warehouseId),
  });
}

/**
 * Enregistrement d'une section de configuration. `null` ramène la section aux valeurs par défaut
 * (confirmation demandée par `confirmReset`).
 */
export function useSaveWarehouseConfig(distributorId: string, warehouseId: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: UpdateWarehouseConfigInput) =>
      adminPartnersApi.updateWarehouseConfig(distributorId, warehouseId, input),
    onSuccess: (config, input) => {
      queryClient.setQueryData(adminWarehouseConfigKey(distributorId, warehouseId), config);
      const reset = Object.values(input).some((v) => v === null);
      toast.success(reset ? 'Valeurs par défaut rétablies' : 'Configuration enregistrée');
    },
    onError: (e) => toast.error(errorMessage(e, "Erreur lors de l'enregistrement de la configuration")),
  });

  const confirmReset = (section: string, input: UpdateWarehouseConfigInput) =>
    Alert.alert(
      'Rétablir les valeurs par défaut ?',
      `La configuration « ${section} » de cet entrepôt sera remplacée par les valeurs par défaut du code.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Rétablir', style: 'destructive', onPress: () => mutation.mutate(input) },
      ],
    );

  return { save: mutation.mutate, isSaving: mutation.isPending, confirmReset };
}
