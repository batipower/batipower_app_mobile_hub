import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { PickerList } from '@/components/sheet/PickerList';
import { Button } from '@/components/ui';

import { patchPricingFilters, usePricingState } from './filtersStore';
import { usePricingAffaires, usePricingBrands, usePricingTags } from './hooks/usePricingOptions';
import { usePricingRow } from './hooks/usePricingRow';
import { useUpdatePricingRow } from './hooks/useUpdatePricingRow';
import type { PricingPickerKind } from './navigation';

const MAX_TAGS = 10;

function BrandsPicker() {
  const { filters } = usePricingState();
  const { brands, loading, error } = usePricingBrands(filters.categoryTypes);
  const items = useMemo(() => brands.map((b) => ({ value: b, label: b })), [brands]);
  return (
    <PickerList
      title={filters.brands.length > 0 ? `Marques (${filters.brands.length})` : 'Marques'}
      items={items}
      selected={filters.brands}
      loading={loading}
      error={error}
      multiple
      onToggle={(value) =>
        patchPricingFilters({
          brands: filters.brands.includes(value)
            ? filters.brands.filter((b) => b !== value)
            : [...filters.brands, value],
        })
      }
    />
  );
}

function TagsPicker() {
  const { filters } = usePricingState();
  const { tags, loading, error } = usePricingTags();
  const items = useMemo(() => tags.map((tag) => ({ value: tag, label: tag })), [tags]);
  return (
    <PickerList
      title={filters.productTags.length > 0 ? `Tags (${filters.productTags.length})` : 'Tags'}
      items={items}
      selected={filters.productTags}
      loading={loading}
      error={error}
      multiple
      onToggle={(value) =>
        patchPricingFilters({
          productTags: filters.productTags.includes(value)
            ? filters.productTags.filter((tag) => tag !== value)
            : [...filters.productTags, value].slice(0, MAX_TAGS),
        })
      }
    />
  );
}

function AffairesPicker() {
  const { filters } = usePricingState();
  const { affaires, loading, error } = usePricingAffaires();
  const items = useMemo(() => affaires.map((a) => ({ value: a.uuid, label: a.name })), [affaires]);
  return (
    <PickerList
      title="Affaire"
      items={items}
      selected={filters.affaireId ? [filters.affaireId] : []}
      loading={loading}
      error={error}
      multiple={false}
      noneLabel="Toutes les affaires"
      onToggle={(value) => {
        patchPricingFilters({ affaireId: value === filters.affaireId ? '' : value });
        router.back();
      }}
    />
  );
}

/** Tags d'une ligne : brouillon local, enregistré d'un coup (PATCH `productTags`). */
function EditTagsPicker({ reference }: { reference: string }) {
  const { row } = usePricingRow(reference);
  const { tags, loading, error } = usePricingTags();
  const update = useUpdatePricingRow();
  const [draft, setDraft] = useState<string[] | null>(null);
  const current = draft ?? row?.productTags ?? [];
  const items = useMemo(() => tags.map((tag) => ({ value: tag, label: tag })), [tags]);

  const save = () => {
    update.mutate(
      { reference, payload: { productTags: current } },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <PickerList
      title={`Tags de ${reference}`}
      items={items}
      selected={current}
      loading={loading || !row}
      error={error}
      multiple
      creatable
      closeLabel="Annuler"
      onToggle={(value) =>
        setDraft(
          current.includes(value)
            ? current.filter((tag) => tag !== value)
            : [...current, value].slice(0, MAX_TAGS),
        )
      }
      footer={<Button label="Enregistrer" loading={update.isPending} onPress={save} />}
    />
  );
}

/** Feuille de choix : marques, tags et affaire du filtre, ou tags d'une ligne. */
export function PickerSheet() {
  const { kind, reference } = useLocalSearchParams<{
    kind: PricingPickerKind;
    reference?: string;
  }>();
  if (kind === 'brands') return <BrandsPicker />;
  if (kind === 'tags') return <TagsPicker />;
  if (kind === 'affaires') return <AffairesPicker />;
  if (kind === 'edit-tags' && reference) return <EditTagsPicker reference={reference} />;
  return null;
}
