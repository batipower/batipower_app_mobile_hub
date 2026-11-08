import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { adminPartnersApi } from '@/api/adminPartners';
import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button, TextField } from '@/components/ui';
import { errorMessage } from '@/features/preparation/components/ListState';
import { makeStyles, spacing } from '@/theme';
import type { Warehouse } from '@/types/admin';

import { LEGACY_WAREHOUSES, warehouseLabel } from '../shared/accessRules';
import { Notice, SelectField } from '../shared/components/FormParts';
import { useDistributors, useRefreshPartners } from './hooks';

/** Feuille d'ajout d'un entrepôt à un distributeur (`distributorId` en paramètre). */
export function WarehouseFormSheet() {
  const { distributorId } = useLocalSearchParams<{ distributorId: string }>();
  const styles = useStyles();
  const refresh = useRefreshPartners();
  const distributors = useDistributors();
  const [name, setName] = useState('');
  const [legacy, setLegacy] = useState<Warehouse | ''>('');
  const [depSource, setDepSource] = useState('');

  const taken = useMemo(
    () => new Set((distributors.data ?? []).flatMap((d) => d.warehouses.map((w) => w.warehouse).filter(Boolean))),
    [distributors.data],
  );
  const legacyOptions = LEGACY_WAREHOUSES.map((w) => ({
    value: w.value,
    label: w.label,
    detail: taken.has(w.value) ? 'Déjà rattaché à un entrepôt' : undefined,
    disabled: taken.has(w.value),
  }));
  const depSourceOptions = (distributors.data ?? []).flatMap((d) =>
    d.warehouses.map((w) => ({ value: w.id, label: w.name, detail: d.name })),
  );

  const mutation = useMutation({
    mutationFn: () =>
      adminPartnersApi.addWarehouse(distributorId, {
        name: name.trim(),
        warehouse: legacy || undefined,
        depSourceWarehouseId: depSource || undefined,
      }),
    onSuccess: async () => {
      await refresh();
      toast.success('Entrepôt ajouté');
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e, "Erreur lors de l'ajout de l'entrepôt")),
  });

  return (
    <SheetScreen
      title="Nouvel entrepôt"
      closeLabel="Annuler"
      closeDisabled={mutation.isPending}
      footer={
        <Button
          label="Ajouter"
          loading={mutation.isPending}
          disabled={name.trim().length < 2}
          onPress={() => mutation.mutate()}
          style={styles.submit}
        />
      }
    >
      <TextField label="Nom" value={name} onChangeText={setName} placeholder="Entrepôt de…" />
      <SelectField
        label="Lien avec un entrepôt historique"
        hint="Optionnel : relie l'entrepôt à Flevy, Dombasle… pour piloter le HUB. Laisser vide pour un entrepôt libre."
        valueLabel={legacy ? warehouseLabel(legacy) : ''}
        placeholder="Aucun (entrepôt libre)"
        options={legacyOptions}
        selected={legacy ? [legacy] : []}
        searchable={false}
        noneLabel="Aucun (entrepôt libre)"
        onToggle={(v) => setLegacy(v as Warehouse | '')}
      />
      <SelectField
        label="Partage les DEP de…"
        hint="Optionnel : cet entrepôt reprend les DEP d'un autre (ex. Nancy → Dombasle)."
        valueLabel={depSourceOptions.find((o) => o.value === depSource)?.label ?? ''}
        placeholder="Indépendant"
        options={depSourceOptions}
        selected={depSource ? [depSource] : []}
        noneLabel="Indépendant"
        onToggle={setDepSource}
      />
      <Notice>
        Un entrepôt sans compte eBatPro actif ne pourra pas proposer de prix sur les opportunités DEP.
      </Notice>
    </SheetScreen>
  );
}

const useStyles = makeStyles(() => ({
  submit: { marginBottom: spacing.sm },
}));
