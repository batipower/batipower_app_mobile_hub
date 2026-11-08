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
import type { AdminDistributor, UpdateDistributorPayload } from '@/types/adminPartners';

import { Field, Notice, SelectField, ToggleRow } from '../shared/components/FormParts';
import { useDistributor, useRefreshPartners } from './hooks';

const ACCESS_OPTIONS = [
  { value: 'ALL', label: 'Ouvertes + DEP', detail: 'Accès à toutes les opportunités' },
  { value: 'DEP_ONLY', label: 'DEP uniquement', detail: 'Uniquement ses propres DEP' },
];

/** Feuille de création (sans `id`) ou de modification d'un distributeur. */
export function DistributorFormSheet() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { distributor } = useDistributor(id);
  if (id && !distributor) {
    return (
      <SheetScreen title="Distributeur">
        <Text>Chargement…</Text>
      </SheetScreen>
    );
  }
  return <DistributorForm distributor={distributor} />;
}

function DistributorForm({ distributor }: { distributor?: AdminDistributor }) {
  const styles = useStyles();
  const refresh = useRefreshPartners();
  const [name, setName] = useState(distributor?.name ?? '');
  const [slug, setSlug] = useState('');
  const [isActive, setIsActive] = useState(distributor?.isActive ?? true);
  const [access, setAccess] = useState<'ALL' | 'DEP_ONLY'>(distributor?.opportunityAccess ?? 'ALL');
  const [depByWarehouse, setDepByWarehouse] = useState(distributor?.depByWarehouse ?? false);
  const [rebate, setRebate] = useState(
    distributor?.rebateRate !== undefined ? String(Math.round(distributor.rebateRate * 10000) / 100).replace('.', ',') : '',
  );

  const rebateValue = rebate.trim() === '' ? undefined : Number(rebate.replace(',', '.'));
  const rebateError =
    rebateValue !== undefined && (!Number.isFinite(rebateValue) || rebateValue < 0 || rebateValue >= 50)
      ? 'Entre 0 et moins de 50 %.'
      : undefined;
  const valid = name.trim().length >= 2 && !rebateError;

  const mutation = useMutation({
    mutationFn: () => {
      if (!distributor) {
        return adminPartnersApi.createDistributor({ name: name.trim(), slug: slug.trim() || undefined });
      }
      const payload: UpdateDistributorPayload = {
        name: name.trim(),
        isActive,
        opportunityAccess: access,
        depByWarehouse,
      };
      if (rebateValue !== undefined) payload.rebateRate = rebateValue / 100;
      return adminPartnersApi.updateDistributor(distributor.id, payload);
    },
    onSuccess: async () => {
      await refresh();
      toast.success(distributor ? 'Distributeur mis à jour' : 'Distributeur créé');
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e, "Erreur lors de l'enregistrement")),
  });

  return (
    <SheetScreen
      title={distributor ? 'Modifier le distributeur' : 'Nouveau distributeur'}
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
      <TextField label="Nom" value={name} onChangeText={setName} placeholder="Nom du distributeur" />
      {!distributor ? (
        <>
          <TextField
            label="Identifiant (optionnel)"
            value={slug}
            onChangeText={(v) => setSlug(v.toLowerCase())}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="généré depuis le nom"
          />
          <Notice>
            Après la création, ajoutez un entrepôt, puis une filiale et un compte eBatPro, pour que le distributeur soit prêt.
          </Notice>
        </>
      ) : (
        <>
          <ToggleRow
            label="Distributeur actif"
            description="Inactif, ses filiales ne sont plus proposées à l'inscription."
            value={isActive}
            onValueChange={setIsActive}
          />
          <SelectField
            label="Accès aux opportunités"
            valueLabel={ACCESS_OPTIONS.find((o) => o.value === access)?.label ?? ''}
            options={ACCESS_OPTIONS}
            selected={[access]}
            searchable={false}
            onToggle={(v) => setAccess(v === 'DEP_ONLY' ? 'DEP_ONLY' : 'ALL')}
          />
          <ToggleRow
            label="DEP par entrepôt"
            description="Les DEP sont réparties par entrepôt plutôt que pour tout le distributeur."
            value={depByWarehouse}
            onValueChange={setDepByWarehouse}
          />
          <Field label="BFA / gain négocié (%)" hint="Entre 0 et moins de 50 %. Laisser vide pour ne pas modifier.">
            <TextField
              label=""
              value={rebate}
              onChangeText={setRebate}
              keyboardType="decimal-pad"
              placeholder="2"
              error={rebateError}
            />
          </Field>
        </>
      )}
    </SheetScreen>
  );
}

const useStyles = makeStyles(() => ({
  submit: { marginBottom: spacing.sm },
}));
