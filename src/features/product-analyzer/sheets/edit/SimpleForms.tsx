import { router } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner-native';
import { z } from 'zod';

import { hubProductAnalyzerApi } from '@/api/hubProductAnalyzer';
import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button } from '@/components/ui';
import { ChoiceField } from '@/features/pricing/components/FilterControls';
import { fontSize, makeStyles, spacing } from '@/theme';

import { assignItemsToAffaire, refreshAnalyzerData } from '../../bulkActions';
import { useDistributors } from '../../hooks/useDistributors';
import { useStagingDetail } from '../../hooks/useStagingDetail';
import { patchStagingInCache } from '../../lib/cache';
import { apiErrorMessage } from '../../lib/errors';
import { truncateLaunchFromStagingTitle } from '../../lib/helpers';
import { readSkipWeight } from '../../lib/preferences';
import { snapshotOf } from '../../lib/snapshot';
import { openPaLive } from '../../navigation';
import { PA_AFFAIRES_KEY, PA_ROOT, paStagingKey } from '../../queryKeys';
import { useAnalyzerEngine } from '../../socket/AnalyzerSocketProvider';
import { LAUNCH_FROM_STAGING_TITLE_MAX , WS_CFG, CONFIDENCE_CFG } from '../../lib/constants';
import { EAN_PATTERN, FormField, isPositiveDecimal, parseDecimal } from './formKit';
import { formatDateTime } from '@/lib/format';
import { launchFromStagingDone } from './launchFromStagingDone';

const useStyles = makeStyles((t) => ({
  body: { gap: spacing.lg },
  hint: { fontSize: fontSize.xs, color: t.textMuted, lineHeight: 17 },
  info: { fontSize: fontSize.sm, color: t.text },
}));

type SubmitState = { saving: boolean; run: (fn: () => Promise<void>) => Promise<void> };

/** Exécute une soumission : état `saving`, erreur API en toast, jamais de fermeture en cas d'échec. */
function useSubmit(fallback: string): SubmitState {
  const [saving, setSaving] = useState(false);
  return {
    saving,
    run: async (fn) => {
      setSaving(true);
      try {
        await fn();
      } catch (err) {
        toast.error(apiErrorMessage(err, fallback));
      } finally {
        setSaving(false);
      }
    },
  };
}

// ─── Poids ───────────────────────────────────────────────────────────────────

const weightSchema = z.object({
  grams: z.string().refine((v) => isPositiveDecimal(v), 'Poids invalide (grammes, supérieur à 0)'),
});

export function WeightForm({ uuid }: { uuid: string }) {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const { data: item } = useStagingDetail(uuid);
  const submit = useSubmit('Mise à jour du poids impossible');
  const { control, handleSubmit } = useForm<z.infer<typeof weightSchema>>({
    resolver: zodResolver(weightSchema),
    defaultValues: { grams: item?.weightGrams ? String(item.weightGrams) : '' },
  });
  const source = item?.weightSource ? (WS_CFG[item.weightSource] ?? WS_CFG.unknown) : null;
  const confidence = item?.weightConfidence ? CONFIDENCE_CFG[item.weightConfidence] : null;

  const onSubmit = handleSubmit((values) =>
    submit.run(async () => {
      const grams = Math.round(parseDecimal(values.grams));
      const rollback = patchStagingInCache(queryClient, uuid, {
        weightGrams: grams,
        weightPending: false,
        weightSource: 'operator',
      });
      try {
        await hubProductAnalyzerApi.updateWeight(uuid, grams);
      } catch (err) {
        rollback();
        throw err;
      }
      toast.success('Poids enregistré');
      refreshAnalyzerData();
      router.back();
    }),
  );

  return (
    <SheetScreen
      title="Poids du produit"
      closeLabel="Annuler"
      footer={<Button label="Enregistrer" loading={submit.saving} onPress={() => void onSubmit()} />}
    >
      <View style={styles.body}>
        {item?.designation ? <Text style={styles.info}>{item.designation}</Text> : null}
        <FormField
          control={control}
          name="grams"
          label="Poids (grammes)"
          keyboardType="decimal-pad"
          autoFocus
          placeholder="174"
          returnKeyType="done"
          onSubmitEditing={() => void onSubmit()}
        />
        {source ? (
          <Text style={styles.hint}>
            Source actuelle : {source.label}
            {confidence ? ` · confiance ${confidence.label.toLowerCase()}` : ''}. L’enregistrement recalcule le transport et la
            viabilité.
          </Text>
        ) : (
          <Text style={styles.hint}>L’enregistrement recalcule le transport et la viabilité.</Text>
        )}
      </View>
    </SheetScreen>
  );
}

// ─── Marque ──────────────────────────────────────────────────────────────────

const brandSchema = z.object({ brand: z.string().trim().min(1, 'Marque requise').max(100, '100 caractères au plus') });

export function BrandForm({ uuid }: { uuid: string }) {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const { data: item } = useStagingDetail(uuid);
  const submit = useSubmit('Mise à jour de la marque impossible');
  const { control, handleSubmit } = useForm<z.infer<typeof brandSchema>>({
    resolver: zodResolver(brandSchema),
    defaultValues: { brand: item?.brand ?? '' },
  });

  const onSubmit = handleSubmit(({ brand }) =>
    submit.run(async () => {
      const rollback = patchStagingInCache(queryClient, uuid, { brand });
      try {
        await hubProductAnalyzerApi.updateBrand(uuid, brand);
      } catch (err) {
        rollback();
        throw err;
      }
      toast.success('Marque enregistrée');
      refreshAnalyzerData();
      router.back();
    }),
  );

  return (
    <SheetScreen
      title="Marque"
      closeLabel="Annuler"
      footer={<Button label="Enregistrer" loading={submit.saving} onPress={() => void onSubmit()} />}
    >
      <View style={styles.body}>
        <FormField
          control={control}
          name="brand"
          label="Marque"
          autoFocus
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={() => void onSubmit()}
        />
        <Text style={styles.hint}>La marque est recopiée sur la fiche catalogue au lancement.</Text>
      </View>
    </SheetScreen>
  );
}

// ─── EAN (attacher / modifier) puis relance de l'analyse ─────────────────────

const eanSchema = z.object({
  ean: z.string().trim().regex(EAN_PATTERN, "EAN invalide (8, 12, 13 ou 14 chiffres)"),
  price: z
    .string()
    .trim()
    .refine((v) => v === '' || isPositiveDecimal(v), "Prix d'achat invalide"),
});

export function EanForm({
  uuid,
  mode,
  previousEan,
  warehouse,
  opportunityUuid,
  fromLive,
}: {
  uuid: string;
  mode: 'attach' | 'edit';
  previousEan?: string;
  warehouse?: string;
  opportunityUuid?: string;
  fromLive: boolean;
}) {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const engine = useAnalyzerEngine();
  const { data: item } = useStagingDetail(uuid);
  const submit = useSubmit("Impossible d'attacher l'EAN");
  const { control, handleSubmit } = useForm<z.infer<typeof eanSchema>>({
    resolver: zodResolver(eanSchema),
    defaultValues: { ean: previousEan ?? '', price: '' },
  });

  const onSubmit = handleSubmit((values) =>
    submit.run(async () => {
      const state = engine.getState();
      if (state.queue.running || state.single.phase === 'pending' || state.single.phase === 'running') {
        toast.error('Une analyse est déjà en cours : attendez sa fin.');
        return;
      }
      const price = values.price ? parseDecimal(values.price) : undefined;
      await hubProductAnalyzerApi.attachEan(uuid, {
        ean: values.ean,
        ...(price ? { estimatedBuyPriceHT: price } : {}),
        forceUpdate: !!previousEan && previousEan !== values.ean,
      });
      patchStagingInCache(queryClient, uuid, { ean: values.ean });
      const skipWeight = await readSkipWeight();
      const wh = warehouse ?? item?.warehouse ?? undefined;
      const started = engine.startSingle({
        label: item?.designation || values.ean,
        skipWeight,
        opportunityUuid: opportunityUuid ?? null,
        start: {
          type: 'ean',
          payload: {
            ean: values.ean,
            ...(wh ? { warehouse: wh } : {}),
            stagingId: uuid,
            forceReanalyze: true,
            ...(price ? { estimatedBuyPriceHT: price } : {}),
          },
        },
      });
      refreshAnalyzerData();
      router.back();
      if (started && !fromLive) setTimeout(openPaLive, 380);
    }),
  );

  const changing = mode === 'edit' && !!previousEan;
  return (
    <SheetScreen
      title={changing ? "Modifier l'EAN" : 'Attacher un EAN'}
      closeLabel="Annuler"
      footer={
        <Button
          label={changing ? 'Enregistrer et relancer' : 'Attacher et analyser'}
          loading={submit.saving}
          onPress={() => void onSubmit()}
        />
      }
    >
      <View style={styles.body}>
        {item?.designation ? <Text style={styles.info}>{item.designation}</Text> : null}
        <FormField
          control={control}
          name="ean"
          label="EAN"
          keyboardType="number-pad"
          autoFocus
          maxLength={14}
          placeholder="3700000000000"
        />
        <FormField
          control={control}
          name="price"
          label="Prix d'achat HT estimé (facultatif)"
          keyboardType="decimal-pad"
          placeholder="12,50"
          hint="Sert de base au calcul de marge tant qu'aucun prix fournisseur n'est confirmé."
        />
        <Text style={styles.hint}>
          L’analyse est relancée avec cet EAN : marketplaces, stocks et viabilité sont recalculés
          {changing ? " (l'ancien EAN est remplacé)" : ''}.
        </Text>
      </View>
    </SheetScreen>
  );
}

// ─── Prix négo demandé ───────────────────────────────────────────────────────

const priceSchema = z.object({
  price: z.string().refine((v) => isPositiveDecimal(v, 100_000), 'Prix invalide (supérieur à 0)'),
});

export function NegoPriceForm({
  uuid,
  opportunityUuid,
  price,
  label,
}: {
  uuid: string;
  opportunityUuid: string;
  price?: string;
  label?: string;
}) {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const submit = useSubmit('Modification du prix impossible');
  const { control, handleSubmit } = useForm<z.infer<typeof priceSchema>>({
    resolver: zodResolver(priceSchema),
    defaultValues: { price: price ?? '' },
  });

  const onSubmit = handleSubmit((values) =>
    submit.run(async () => {
      await hubProductAnalyzerApi.updateRequestedPrice(opportunityUuid, { newPriceHT: parseDecimal(values.price) });
      toast.success('Prix demandé mis à jour');
      void queryClient.invalidateQueries({ queryKey: PA_ROOT });
      router.back();
    }),
  );
  void uuid;

  return (
    <SheetScreen
      title="Prix demandé"
      closeLabel="Annuler"
      footer={<Button label="Enregistrer" loading={submit.saving} onPress={() => void onSubmit()} />}
    >
      <View style={styles.body}>
        {label ? <Text style={styles.info}>{label}</Text> : null}
        <FormField
          control={control}
          name="price"
          label="Nouveau prix négo demandé (€ HT)"
          keyboardType="decimal-pad"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => void onSubmit()}
        />
        <Text style={styles.hint}>Modifiable tant que la négociation est ouverte. Le fournisseur voit le nouveau prix.</Text>
      </View>
    </SheetScreen>
  );
}

// ─── Créer la fiche depuis l'analyse ─────────────────────────────────────────

const launchSchema = z.object({
  title: z.string().trim().min(3, 'Titre trop court').max(LAUNCH_FROM_STAGING_TITLE_MAX, `${LAUNCH_FROM_STAGING_TITLE_MAX} caractères au plus`),
});

export function LaunchFromStagingForm({ uuid, opportunityUuid }: { uuid: string; opportunityUuid?: string }) {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const { data: item } = useStagingDetail(uuid);
  const submit = useSubmit('Création impossible');
  const snap = item ? snapshotOf(item) : null;
  const { control, handleSubmit } = useForm<z.infer<typeof launchSchema>>({
    resolver: zodResolver(launchSchema),
    defaultValues: {
      title: truncateLaunchFromStagingTitle(
        snap?.eb ?? { designation: item?.designation },
        snap?.az ?? undefined,
        LAUNCH_FROM_STAGING_TITLE_MAX,
      ),
    },
  });

  const onSubmit = handleSubmit(({ title }) =>
    submit.run(async () => {
      const res = await hubProductAnalyzerApi.launchFromStaging(uuid, title);
      if (res?.success === false) {
        toast.error(res.message || 'Création refusée');
        return;
      }
      await launchFromStagingDone(queryClient, uuid, res?.batipowerId ?? null, opportunityUuid);
      toast.success('Fiche catalogue créée');
      router.back();
    }),
  );

  return (
    <SheetScreen
      title="Créer depuis l'analyse"
      closeLabel="Annuler"
      footer={<Button label="Créer la fiche" loading={submit.saving} onPress={() => void onSubmit()} />}
    >
      <View style={styles.body}>
        <FormField
          control={control}
          name="title"
          label="Désignation catalogue"
          multiline
          autoFocus
          maxLength={LAUNCH_FROM_STAGING_TITLE_MAX}
        />
        <Text style={styles.hint}>
          Pour un produit saisi par EAN sans référence fournisseur : la fiche est créée à partir des données Amazon et de
          l’analyse. Dernière analyse : {formatDateTime(item?.lastAnalyzedAt ?? item?.createdAt) ?? '—'}.
        </Text>
      </View>
    </SheetScreen>
  );
}

// ─── Marque d'une affaire ────────────────────────────────────────────────────

export function AffaireBrandForm({ affaireId }: { affaireId: string }) {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const submit = useSubmit("Impossible d'appliquer la marque");
  const { control, handleSubmit } = useForm<z.infer<typeof brandSchema>>({
    resolver: zodResolver(brandSchema),
    defaultValues: { brand: '' },
  });

  const onSubmit = handleSubmit(({ brand }) =>
    submit.run(async () => {
      const res = await hubProductAnalyzerApi.updateAffaireBrand(affaireId, brand);
      void queryClient.invalidateQueries({ queryKey: PA_ROOT });
      if (res.errors.length > 0) toast.error(`${res.updated}/${res.total} produits mis à jour, ${res.errors.length} en erreur`);
      else toast.success(`Marque appliquée à ${res.updated} produit${res.updated > 1 ? 's' : ''}`);
      router.back();
    }),
  );

  return (
    <SheetScreen
      title="Marque de l'affaire"
      closeLabel="Annuler"
      footer={<Button label="Appliquer à tous les produits" loading={submit.saving} onPress={() => void onSubmit()} />}
    >
      <View style={styles.body}>
        <FormField control={control} name="brand" label="Marque" autoFocus autoCapitalize="words" />
        <Text style={styles.hint}>La marque remplace celle de TOUS les produits de l’affaire (toutes pages).</Text>
      </View>
    </SheetScreen>
  );
}

// ─── Nouvelle affaire ────────────────────────────────────────────────────────

const affaireSchema = z.object({
  name: z.string().trim().min(2, 'Nom requis').max(120, '120 caractères au plus'),
  description: z.string().trim().max(500, '500 caractères au plus'),
});

/** Crée une affaire (une par fournisseur) ; avec `uuid`, y rattache aussitôt le produit. */
export function NewAffaireForm({ uuid }: { uuid?: string }) {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const { distributors, withWarehouse } = useDistributors();
  const { data: item } = useStagingDetail(uuid);
  const submit = useSubmit("Création de l'affaire impossible");
  const choices = withWarehouse.length > 0 ? withWarehouse : distributors;
  const [distributorId, setDistributorId] = useState<string>(
    () => choices.find((d) => d.ebatproWarehouse === item?.warehouse)?.id ?? choices[0]?.id ?? '',
  );
  const { control, handleSubmit } = useForm<z.infer<typeof affaireSchema>>({
    resolver: zodResolver(affaireSchema),
    defaultValues: { name: '', description: '' },
  });

  const onSubmit = handleSubmit((values) =>
    submit.run(async () => {
      if (!distributorId) {
        toast.error('Choisissez un fournisseur.');
        return;
      }
      const created = await hubProductAnalyzerApi.createAffaire({
        name: values.name,
        ...(values.description ? { description: values.description } : {}),
        distributorId,
      });
      void queryClient.invalidateQueries({ queryKey: PA_AFFAIRES_KEY });
      if (item) {
        await assignItemsToAffaire([item], created);
        void queryClient.invalidateQueries({ queryKey: paStagingKey(item.uuid) });
      } else {
        toast.success('Affaire créée');
      }
      router.back();
    }),
  );

  return (
    <SheetScreen
      title="Nouvelle affaire"
      closeLabel="Annuler"
      footer={<Button label={item ? 'Créer et rattacher' : 'Créer'} loading={submit.saving} onPress={() => void onSubmit()} />}
    >
      <View style={styles.body}>
        <FormField control={control} name="name" label="Nom" autoFocus />
        <FormField control={control} name="description" label="Description (facultatif)" multiline />
        <ChoiceField
          label="Fournisseur"
          options={choices.map((d) => ({ value: d.id, label: d.name }))}
          value={distributorId}
          onChange={setDistributorId}
        />
        <Text style={styles.hint}>Une affaire regroupe des produits pour un fournisseur : ses négociations sont cloisonnées.</Text>
      </View>
    </SheetScreen>
  );
}
