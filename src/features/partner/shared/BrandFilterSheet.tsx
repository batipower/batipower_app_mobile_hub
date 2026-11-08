import { router } from 'expo-router';

import { PickerList } from '@/components/sheet/PickerList';

type BrandFilterSheetProps = {
  brands: string[] | undefined;
  loading: boolean;
  error: unknown;
  /** Marque retenue ; `null` = toutes. */
  selected: string | null;
  onSelect: (brand: string | null) => void;
  onRetry: () => void;
};

/** Feuille de choix d'une marque (filtre à sélection unique, fermée dès le choix). */
export function BrandFilterSheet({
  brands,
  loading,
  error,
  selected,
  onSelect,
  onRetry,
}: BrandFilterSheetProps) {
  return (
    <PickerList
      title="Marque"
      items={(brands ?? []).map((brand) => ({ value: brand, label: brand }))}
      selected={selected ? [selected] : []}
      loading={loading}
      error={error}
      multiple={false}
      noneLabel="Toutes les marques"
      closeLabel="Fermer"
      onRetry={onRetry}
      onToggle={(value) => {
        onSelect(value === '' ? null : value);
        router.back();
      }}
    />
  );
}
