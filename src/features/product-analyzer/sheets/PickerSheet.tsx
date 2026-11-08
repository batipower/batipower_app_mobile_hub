import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { hubProductAnalyzerApi } from '@/api/hubProductAnalyzer';
import { PickerList } from '@/components/sheet/PickerList';
import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button } from '@/components/ui';
import { SegmentedControl } from '@/features/preparation/components/SegmentedControl';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';

import { applyDepToItems, assignItemsToAffaire } from '../bulkActions';
import { patchLauncherDraft, useLauncherDraft } from '../launcherStore';
import { patchPaFilters, usePaFilters } from '../filtersStore';
import { useDistributors } from '../hooks/useDistributors';
import { useAffaires, useBrands, useStagingList, useTags } from '../hooks/useStagingList';
import { apiErrorMessage } from '../lib/errors';
import { patchStagingInCache } from '../lib/cache';
import { dismissThen, openPaEdit, type PaPickerKind } from '../navigation';
import { PA_TAGS_KEY, paStagingKey } from '../queryKeys';
import { getSelectedItems, useSelection } from '../selectionStore';

import { BulkActionsSheet } from './BulkActionsSheet';
import { BulkLaunchSheet } from './BulkLaunchSheet';
import { ItemActionsSheet } from './ItemActionsSheet';
import { StockFilterSheet } from './StockFilterSheet';

const MAX_TAGS = 10;

function toggled(list: string[], value: string, max = Infinity): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value].slice(0, max);
}

function BrandsPicker() {
  const f = usePaFilters();
  const brands = useBrands(f);
  const items = useMemo(() => (brands.data ?? []).map((b) => ({ value: b, label: b })), [brands.data]);
  return (
    <PickerList
      title={f.brands.length > 0 ? `Marques (${f.brands.length})` : 'Marques'}
      items={items}
      selected={f.brands}
      loading={brands.isPending}
      error={brands.error}
      multiple
      onRetry={() => void brands.refetch()}
      onToggle={(value) => patchPaFilters({ brands: toggled(f.brands, value) })}
    />
  );
}

function TagsPicker() {
  const f = usePaFilters();
  const tags = useTags();
  const items = useMemo(() => (tags.data ?? []).map((tag) => ({ value: tag, label: tag })), [tags.data]);
  return (
    <PickerList
      title={f.tags.length > 0 ? `Tags (${f.tags.length})` : 'Tags'}
      items={items}
      selected={f.tags}
      loading={tags.isPending}
      error={tags.error}
      multiple
      onRetry={() => void tags.refetch()}
      onToggle={(value) => patchPaFilters({ tags: toggled(f.tags, value, MAX_TAGS) })}
    />
  );
}

function AffairesPicker() {
  const t = useTheme();
  const f = usePaFilters();
  const affaires = useAffaires();
  const items = useMemo(
    () =>
      (affaires.data ?? []).map((a) => ({
        value: a.uuid,
        label: a.name,
        count: a.stagingCount,
        ...(a.distributorName
          ? { detail: `Fournisseur ${a.distributorName}` }
          : { warning: 'Fournisseur à choisir (affaire historique)' }),
      })),
    [affaires.data],
  );
  const current = f.affaire && f.affaireId ? [f.affaireId] : [];
  return (
    <PickerList
      title="Affaire"
      items={items}
      selected={current}
      loading={affaires.isPending}
      error={affaires.error}
      multiple={false}
      noneLabel="Toutes les analyses"
      footer={
        <Button
          label="Créer une affaire"
          variant="outline"
          leadingIcon={<Plus size={16} color={t.text} />}
          onPress={() => dismissThen(() => openPaEdit('new-affaire', { filter: '1' }))}
        />
      }
      onRetry={() => void affaires.refetch()}
      onToggle={(value) => {
        const next = value && value !== f.affaireId ? value : '';
        patchPaFilters({ affaire: !!next, affaireId: next });
        router.back();
      }}
    />
  );
}

/** Affaire du lancement (ou de la réserve) : stockée dans le brouillon de la feuille « Analyser ». */
function LauncherAffairePicker({ field }: { field: 'affaireId' | 'reserveAffaireId' }) {
  const draft = useLauncherDraft();
  const affaires = useAffaires();
  const items = useMemo(
    () =>
      (affaires.data ?? []).map((a) => ({
        value: a.uuid,
        label: a.distributorName ? `${a.name} · ${a.distributorName}` : a.name,
      })),
    [affaires.data],
  );
  const current = draft[field];
  return (
    <PickerList
      title="Affaire"
      items={items}
      selected={current ? [current] : []}
      loading={affaires.isPending}
      error={affaires.error}
      multiple={false}
      noneLabel={field === 'affaireId' ? 'Aucune affaire' : 'Toutes les affaires'}
      onRetry={() => void affaires.refetch()}
      onToggle={(value) => {
        patchLauncherDraft({ [field]: value && value !== current ? value : '' });
        router.back();
      }}
    />
  );
}

function DistributorsPicker() {
  const f = usePaFilters();
  const { distributors, isLoading } = useDistributors();
  const items = useMemo(() => distributors.map((d) => ({ value: d.id, label: d.name })), [distributors]);
  return (
    <PickerList
      title="Fournisseur"
      items={items}
      selected={f.distributorId ? [f.distributorId] : []}
      loading={isLoading}
      error={null}
      multiple={false}
      noneLabel="Tous les fournisseurs"
      onToggle={(value) => {
        const next = value && value !== f.distributorId ? value : '';
        patchPaFilters(next ? { distributorId: next } : { distributorId: '', offerTrack: '', missingCode: false });
        router.back();
      }}
    />
  );
}

/** Fournisseurs sur le stock desquels portent les filtres de stock (au lieu de l'entrepôt principal). */
function StockSuppliersPicker() {
  const f = usePaFilters();
  const { distributors, isLoading } = useDistributors();
  const items = useMemo(() => distributors.map((d) => ({ value: d.id, label: d.name })), [distributors]);
  return (
    <PickerList
      title={f.stockDistributorIds.length > 0 ? `Stock chez (${f.stockDistributorIds.length})` : 'Stock chez'}
      items={items}
      selected={f.stockDistributorIds}
      loading={isLoading}
      error={null}
      multiple
      onToggle={(value) => patchPaFilters({ stockDistributorIds: toggled(f.stockDistributorIds, value) })}
    />
  );
}

function BulkAffairePicker() {
  const affaires = useAffaires();
  const selection = useSelection();
  const items = useMemo(
    () =>
      (affaires.data ?? []).map((a) => ({
        value: a.uuid,
        label: a.distributorName ? `${a.name} · ${a.distributorName}` : a.name,
      })),
    [affaires.data],
  );
  return (
    <PickerList
      title={`Ajouter ${selection.size} produit${selection.size > 1 ? 's' : ''} à…`}
      items={items}
      selected={[]}
      loading={affaires.isPending}
      error={affaires.error}
      multiple={false}
      onRetry={() => void affaires.refetch()}
      onToggle={(value) => {
        const affaire = affaires.data?.find((a) => a.uuid === value);
        if (!affaire) return;
        const targets = getSelectedItems();
        router.back();
        setTimeout(() => void assignItemsToAffaire(targets, affaire), 350);
      }}
    />
  );
}

function BulkDepPicker() {
  const styles = useStyles();
  const selection = useSelection();
  const { distributors, isLoading } = useDistributors();
  const [planned, setPlanned] = useState<'set' | 'unset'>('set');
  const [chosen, setChosen] = useState<string | null>(null);
  const items = useMemo(() => distributors.map((d) => ({ value: d.id, label: d.name })), [distributors]);
  const chosenName = distributors.find((d) => d.id === chosen)?.name;

  const apply = () => {
    if (!chosen || !chosenName) return;
    const targets = getSelectedItems();
    router.back();
    setTimeout(() => void applyDepToItems(targets, chosen, chosenName, planned === 'set'), 350);
  };

  return (
    <PickerList
      title={`DEP · ${selection.size} produit${selection.size > 1 ? 's' : ''}`}
      items={items}
      selected={chosen ? [chosen] : []}
      loading={isLoading}
      error={null}
      multiple={false}
      onToggle={(value) => setChosen(value || null)}
      footer={
        <View style={styles.footer}>
          <SegmentedControl
            segments={[
              { key: 'set', label: 'Poser la DEP' },
              { key: 'unset', label: 'Retirer la DEP' },
            ]}
            value={planned}
            onChange={setPlanned}
          />
          <Button
            label={chosenName ? `${planned === 'set' ? 'Poser' : 'Retirer'} la DEP ${chosenName}` : 'Choisir un fournisseur'}
            disabled={!chosen}
            onPress={apply}
          />
        </View>
      }
    />
  );
}

/** Tags d'un produit : brouillon local, enregistré d'un coup (PATCH tags) avec mise à jour optimiste. */
function EditTagsPicker({ uuid }: { uuid: string }) {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const tags = useTags();
  const detail = queryClient.getQueryData<{ tags?: string[] | null }>(paStagingKey(uuid));
  const list = useStagingList(usePaFilters());
  const fromList = list.items.find((i) => i.uuid === uuid)?.tags;
  const initial = detail?.tags ?? fromList ?? [];
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const current = draft ?? initial;
  const items = useMemo(() => (tags.data ?? []).map((tag) => ({ value: tag, label: tag })), [tags.data]);

  const save = async () => {
    setSaving(true);
    const rollback = patchStagingInCache(queryClient, uuid, { tags: current });
    try {
      const res = await hubProductAnalyzerApi.updateTags(uuid, current);
      patchStagingInCache(queryClient, uuid, { tags: res.tags ?? current });
      void queryClient.invalidateQueries({ queryKey: PA_TAGS_KEY });
      router.back();
    } catch (err) {
      rollback();
      toast.error(apiErrorMessage(err, 'Impossible de mettre à jour les tags'));
      setSaving(false);
    }
  };

  return (
    <PickerList
      title="Tags du produit"
      items={items}
      selected={current}
      loading={tags.isPending}
      error={tags.error}
      multiple
      creatable
      closeLabel="Annuler"
      onRetry={() => void tags.refetch()}
      onToggle={(value) => setDraft(toggled(current, value, MAX_TAGS))}
      footer={
        <View style={styles.footer}>
          <Text style={styles.hint}>Les tags sont recopiés sur la fiche catalogue au lancement.</Text>
          <Button label="Enregistrer" loading={saving} onPress={() => void save()} />
        </View>
      }
    />
  );
}

/** Feuille de choix (route `choix/[kind]`) : filtres, actions groupées et actions d'un produit. */
export function PickerSheet() {
  const { kind, uuid, mode } = useLocalSearchParams<{ kind: PaPickerKind; uuid?: string; mode?: string }>();
  switch (kind) {
    case 'brands':
      return <BrandsPicker />;
    case 'tags':
      return <TagsPicker />;
    case 'affaires':
      return <AffairesPicker />;
    case 'launch-affaire':
      return <LauncherAffairePicker field="affaireId" />;
    case 'reserve-affaire':
      return <LauncherAffairePicker field="reserveAffaireId" />;
    case 'distributors':
      return <DistributorsPicker />;
    case 'stock':
      return <StockFilterSheet />;
    case 'stock-suppliers':
      return <StockSuppliersPicker />;
    case 'bulk-affaire':
      return <BulkAffairePicker />;
    case 'bulk-dep':
      return <BulkDepPicker />;
    case 'bulk-launch':
      return <BulkLaunchSheet initialMode={mode === 'deploy' ? 'deploy' : 'launch'} />;
    case 'bulk-actions':
      return <BulkActionsSheet />;
    case 'edit-tags':
      return uuid ? <EditTagsPicker uuid={uuid} /> : null;
    case 'item-actions':
      return uuid ? <ItemActionsSheet uuid={uuid} /> : null;
    default:
      return (
        <SheetScreen title="Choix">
          <Text>Choix inconnu.</Text>
        </SheetScreen>
      );
  }
}

const useStyles = makeStyles((t) => ({
  footer: { gap: spacing.md },
  hint: { fontSize: fontSize.xs, color: t.textMuted },
}));
