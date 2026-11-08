import { useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { adminEbatproApi } from '@/api/adminPartners';
import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button, TextField } from '@/components/ui';
import { errorMessage } from '@/features/preparation/components/ListState';
import { makeStyles, spacing } from '@/theme';
import type { EbatproAccount } from '@/types/adminPartners';

import { warehouseSupportsEbatpro } from '../../shared/accessRules';
import { Notice, SelectField, ToggleRow } from '../../shared/components/FormParts';
import { useDistributors, useEbatproAccounts, useRefreshPartners } from '../hooks';

/** Feuille de création (`warehouseId`) ou de modification (`id`) d'un compte eBatPro. */
export function EbatproAccountFormSheet() {
  const { id, warehouseId } = useLocalSearchParams<{ id?: string; warehouseId?: string }>();
  const accounts = useEbatproAccounts();
  const account = id ? accounts.data?.accounts.find((a) => a.id === id) : undefined;
  if (id && !account) {
    return (
      <SheetScreen title="Compte eBatPro">
        <Text>Chargement…</Text>
      </SheetScreen>
    );
  }
  return (
    <AccountForm
      account={account}
      initialWarehouseId={account?.distributorWarehouseId ?? warehouseId ?? ''}
      encryptionAvailable={accounts.data?.encryptionAvailable ?? true}
    />
  );
}

function AccountForm({
  account,
  initialWarehouseId,
  encryptionAvailable,
}: {
  account?: EbatproAccount;
  initialWarehouseId: string;
  encryptionAvailable: boolean;
}) {
  const styles = useStyles();
  const refresh = useRefreshPartners();
  const distributors = useDistributors();
  const [label, setLabel] = useState(account?.label ?? '');
  const [login, setLogin] = useState(account?.login ?? '');
  const [password, setPassword] = useState('');
  const [warehouseId, setWarehouseId] = useState(initialWarehouseId);
  const [isActive, setIsActive] = useState(account?.isActive ?? true);
  const [isDefault, setIsDefault] = useState(account?.isDefault ?? false);
  const [erpStoreId, setErpStoreId] = useState(account?.erpStoreId ?? '');
  const [worksiteCode, setWorksiteCode] = useState(account?.worksiteCode ?? '');

  const warehouseOptions = (distributors.data ?? []).flatMap((d) =>
    d.warehouses
      .filter((w) => warehouseSupportsEbatpro(w.warehouse))
      .map((w) => ({ value: w.id, label: w.name, detail: d.name })),
  );

  const valid =
    encryptionAvailable &&
    label.trim().length > 0 &&
    login.trim().length > 0 &&
    (account ? true : password.length > 0 && warehouseId !== '');

  const mutation = useMutation({
    mutationFn: () => {
      if (!account) {
        return adminEbatproApi.create({
          label: label.trim(),
          login: login.trim(),
          password,
          distributorWarehouseId: warehouseId,
          isActive,
          isDefault,
          erpStoreId: erpStoreId.trim() || undefined,
          worksiteCode: worksiteCode.trim() || undefined,
        });
      }
      return adminEbatproApi.update(account.id, {
        label: label.trim(),
        login: login.trim(),
        password: password || undefined,
        distributorWarehouseId: warehouseId,
        isActive,
        erpStoreId: erpStoreId.trim(),
        worksiteCode: worksiteCode.trim(),
      });
    },
    onSuccess: async () => {
      await refresh();
      toast.success(account ? 'Compte mis à jour' : 'Compte créé');
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e, "Erreur lors de l'enregistrement")),
  });

  return (
    <SheetScreen
      title={account ? 'Modifier le compte eBatPro' : 'Nouveau compte eBatPro'}
      closeLabel="Annuler"
      closeDisabled={mutation.isPending}
      footer={
        <Button
          label="Enregistrer"
          loading={mutation.isPending}
          disabled={!valid}
          onPress={() => mutation.mutate()}
          style={styles.submit}
        />
      }
    >
      {!encryptionAvailable ? (
        <Notice tone="warning">
          La clé de chiffrement eBatPro est absente côté serveur : création et modification impossibles.
        </Notice>
      ) : null}
      <TextField label="Libellé" value={label} onChangeText={setLabel} placeholder="Compte principal" />
      <TextField
        label="Identifiant eBatPro"
        value={login}
        onChangeText={setLogin}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextField
        label={account ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        secureToggle
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="none"
        autoComplete="off"
        placeholder={account ? 'Laisser vide pour ne pas modifier' : undefined}
      />
      <SelectField
        label="Entrepôt"
        required={!account}
        valueLabel={warehouseOptions.find((o) => o.value === warehouseId)?.label ?? ''}
        placeholder="Non rattaché"
        options={warehouseOptions}
        selected={warehouseId ? [warehouseId] : []}
        noneLabel={account ? 'Non rattaché' : undefined}
        loading={distributors.isLoading}
        onToggle={setWarehouseId}
      />
      <TextField label="Code magasin (optionnel)" value={erpStoreId} onChangeText={setErpStoreId} autoCapitalize="none" />
      <TextField label="Code chantier (optionnel)" value={worksiteCode} onChangeText={setWorksiteCode} autoCapitalize="none" />
      <ToggleRow label="Compte actif" value={isActive} onValueChange={setIsActive} />
      {!account ? (
        <ToggleRow
          label="Compte par défaut de l'entrepôt"
          description="Utilisé en priorité pour les commandes de l'entrepôt."
          value={isDefault}
          onValueChange={setIsDefault}
        />
      ) : null}
    </SheetScreen>
  );
}

const useStyles = makeStyles(() => ({
  submit: { marginBottom: spacing.sm },
}));
