import { useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { adminPartnersApi } from '@/api/adminPartners';
import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button, TextField } from '@/components/ui';
import { errorMessage } from '@/features/preparation/components/ListState';
import { makeStyles, spacing } from '@/theme';
import type { AdminSubsidiary } from '@/types/adminPartners';

import { SelectField, ToggleRow } from '../shared/components/FormParts';
import { useDistributors, useRefreshPartners } from './hooks';

/**
 * Feuille de filiale : création sous un entrepôt (`warehouseId`) ou modification (`id`). En
 * modification, la filiale peut être déplacée vers un autre entrepôt.
 */
export function SubsidiaryFormSheet() {
  const { id, warehouseId } = useLocalSearchParams<{ id?: string; warehouseId?: string }>();
  const distributors = useDistributors();
  let found: { subsidiary: AdminSubsidiary; warehouseId: string } | undefined;
  if (id) {
    for (const d of distributors.data ?? []) {
      for (const w of d.warehouses) {
        const subsidiary = w.subsidiaries.find((x) => x.id === id);
        if (subsidiary) found = { subsidiary, warehouseId: w.id };
      }
    }
  }

  if (id && !found) {
    return (
      <SheetScreen title="Filiale">
        <Text>Chargement…</Text>
      </SheetScreen>
    );
  }
  return <SubsidiaryForm subsidiary={found?.subsidiary} warehouseId={found?.warehouseId ?? warehouseId ?? ''} />;
}

function SubsidiaryForm({ subsidiary, warehouseId }: { subsidiary?: AdminSubsidiary; warehouseId: string }) {
  const styles = useStyles();
  const refresh = useRefreshPartners();
  const distributors = useDistributors();
  const [name, setName] = useState(subsidiary?.name ?? '');
  const [slug, setSlug] = useState('');
  const [sender, setSender] = useState(subsidiary?.emailSenderName ?? '');
  const [isActive, setIsActive] = useState(subsidiary?.isActive ?? true);
  const [target, setTarget] = useState(warehouseId);

  const warehouseOptions = (distributors.data ?? []).flatMap((d) =>
    d.warehouses.map((w) => ({ value: w.id, label: w.name, detail: d.name })),
  );

  const mutation = useMutation({
    mutationFn: () => {
      if (!subsidiary) {
        return adminPartnersApi.createSubsidiary(warehouseId, {
          name: name.trim(),
          slug: slug.trim() || undefined,
          emailSenderName: sender.trim() || undefined,
        });
      }
      return adminPartnersApi.updateSubsidiary(subsidiary.id, {
        name: name.trim(),
        isActive,
        emailSenderName: sender.trim() || null,
        distributorWarehouseId: target !== warehouseId ? target : undefined,
      });
    },
    onSuccess: async () => {
      await refresh();
      toast.success(subsidiary ? 'Filiale mise à jour' : 'Filiale créée');
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e, "Erreur lors de l'enregistrement")),
  });

  return (
    <SheetScreen
      title={subsidiary ? 'Modifier la filiale' : 'Nouvelle filiale'}
      closeLabel="Annuler"
      closeDisabled={mutation.isPending}
      footer={
        <Button
          label="Enregistrer"
          loading={mutation.isPending}
          disabled={name.trim().length < 2 || !warehouseId}
          onPress={() => mutation.mutate()}
          style={styles.submit}
        />
      }
    >
      <TextField label="Nom" value={name} onChangeText={setName} placeholder="Nom de la filiale" />
      {!subsidiary ? (
        <TextField
          label="Identifiant (optionnel)"
          value={slug}
          onChangeText={(v) => setSlug(v.toLowerCase())}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="généré depuis le nom"
        />
      ) : null}
      <TextField
        label="Nom d'expéditeur des e-mails"
        value={sender}
        onChangeText={setSender}
        placeholder="Optionnel"
      />
      {subsidiary ? (
        <>
          <ToggleRow
            label="Filiale active"
            description="Inactive, elle n'est plus proposée à l'inscription."
            value={isActive}
            onValueChange={setIsActive}
          />
          <SelectField
            label="Entrepôt de rattachement"
            hint="Déplacer la filiale change l'entrepôt qui traite ses commandes."
            valueLabel={warehouseOptions.find((o) => o.value === target)?.label ?? ''}
            options={warehouseOptions}
            selected={[target]}
            onToggle={(v) => v && setTarget(v)}
          />
        </>
      ) : null}
    </SheetScreen>
  );
}

const useStyles = makeStyles(() => ({
  submit: { marginBottom: spacing.sm },
}));
