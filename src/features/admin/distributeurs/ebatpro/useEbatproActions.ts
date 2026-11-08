import { Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { toast } from 'sonner-native';

import { adminEbatproApi } from '@/api/adminPartners';
import { errorMessage } from '@/features/preparation/components/ListState';
import { chooseAction } from '@/lib/actionSheet';
import type { EbatproAccount } from '@/types/adminPartners';

import { useDeleteEntity } from '../distributorMutations';
import { useRefreshPartners } from '../hooks';

type AccountAction = 'test' | 'default' | 'edit' | 'delete';

/** Actions d'un compte eBatPro : test de connexion, compte par défaut, modification, suppression. */
export function useEbatproActions(encryptionAvailable: boolean) {
  const refresh = useRefreshPartners();
  const remove = useDeleteEntity();

  const test = useMutation({
    mutationFn: (account: EbatproAccount) => adminEbatproApi.test(account.id),
    onSuccess: async (res, account) => {
      if (res.success) toast.success(`Connexion réussie (${account.label})`);
      else toast.error(res.message || `Connexion refusée (${account.label})`);
      await refresh();
    },
    onError: (e) => toast.error(errorMessage(e, 'Erreur lors du test de connexion')),
  });

  const setDefault = useMutation({
    mutationFn: (account: EbatproAccount) => adminEbatproApi.setDefault(account.id),
    onSuccess: async (_r, account) => {
      toast.success(`« ${account.label} » est le compte par défaut de son entrepôt`);
      await refresh();
    },
    onError: (e) => toast.error(errorMessage(e, 'Erreur lors du changement de compte par défaut')),
  });

  const openMenu = async (account: EbatproAccount) => {
    const options: { label: string; value: AccountAction; destructive?: boolean }[] = [];
    if (encryptionAvailable) options.push({ label: 'Tester la connexion', value: 'test' });
    if (encryptionAvailable && account.distributorWarehouseId && account.isActive && !account.isDefault) {
      options.push({ label: 'Définir par défaut', value: 'default' });
    }
    if (encryptionAvailable) options.push({ label: 'Modifier', value: 'edit' });
    options.push({ label: 'Supprimer', value: 'delete', destructive: true });
    const action = await chooseAction<AccountAction>(account.label, options, account.login);
    if (action === 'test') test.mutate(account);
    else if (action === 'default') setDefault.mutate(account);
    else if (action === 'edit') router.push({ pathname: '/admin/partenaires/ebatpro-formulaire', params: { id: account.id } });
    else if (action === 'delete') {
      if (account.isDefault) {
        Alert.alert(
          'Compte par défaut',
          "Ce compte est le compte par défaut de son entrepôt. Sa suppression laissera l'entrepôt sans compte par défaut.",
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Continuer', style: 'destructive', onPress: () => remove.confirm({ kind: 'ebatpro', item: account }) },
          ],
        );
      } else {
        remove.confirm({ kind: 'ebatpro', item: account });
      }
    }
  };

  return { openMenu, busyId: test.isPending ? test.variables?.id : setDefault.isPending ? setDefault.variables?.id : undefined };
}
