import { useState } from 'react';
import { router } from 'expo-router';

import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { Button, TextField } from '@/components/ui';
import {
  ChoiceField,
  LinkRow,
  TriStateField,
} from '@/features/pricing/components/FilterControls';
import { SR_CFG, SR_FILTER_ORDER } from '@/features/product-analyzer/lib/constants';
import { formatInteger } from '@/lib/format';
import type {
  ConditioningFilter,
  StagingFilters,
  StagingStatus,
  TriState,
  ViabilityCountry,
  ViabilityTab,
  WeightMode,
} from '@/types/hubProductAnalyzer';

import { countPaFilters, patchPaFilters, resetPaFilters, usePaFilters } from '../filtersStore';
import { useDistributors } from '../hooks/useDistributors';
import { useAffaires, useStagingList } from '../hooks/useStagingList';
import { openPaPicker } from '../navigation';

const STATUS_OPTIONS: { value: StagingStatus | ''; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'LAUNCHED', label: 'Lancés' },
  { value: 'EBAT_NOT_FOUND', label: 'Introuvables' },
];
const VIABILITY_OPTIONS: { value: ViabilityTab; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'viable', label: 'Viable' },
  { value: 'negotiable', label: 'À négocier' },
  { value: 'not_viable', label: 'Non viable' },
];
const COUNTRY_OPTIONS: { value: ViabilityCountry | ''; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'FR', label: '🇫🇷 FR' },
  { value: 'DE', label: '🇩🇪 DE' },
  { value: 'IT', label: '🇮🇹 IT' },
  { value: 'ES', label: '🇪🇸 ES' },
  { value: 'UK', label: '🇬🇧 UK' },
];
const WEIGHT_OPTIONS: { value: WeightMode; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'pending', label: 'Manquant' },
  { value: 'filled', label: 'Renseigné' },
];
type NegoMode = 'all' | 'has' | 'needs';
const NEGO_OPTIONS: { value: NegoMode; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'has', label: 'Négo en cours' },
  { value: 'needs', label: 'Sans négo' },
];
const CONDITIONING_OPTIONS: { value: ConditioningFilter; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'simple', label: 'Simple' },
  { value: 'multiple', label: 'Multiple' },
];
const STOCK_READINESS_OPTIONS = [
  { value: '', label: 'Toutes' },
  ...SR_FILTER_ORDER.map((key) => ({ value: key, label: SR_CFG[key].shortLabel })),
];
const OFFER_TRACK_OPTIONS: { value: StagingFilters['offerTrack']; label: string }[] = [
  { value: '', label: 'Toutes' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'DISTRIBUTOR_CLEARANCE', label: 'Destockage' },
];

const toTri = (v: TriState): boolean | null => (v === '' ? null : v === 'true');
const fromTri = (v: boolean | null): TriState => (v === null ? '' : v ? 'true' : 'false');

function summarize(values: string[], empty: string): string {
  if (values.length === 0) return empty;
  return values.length === 1 ? values[0]! : `${values.length} sélectionnés`;
}

/**
 * Tous les filtres de l'historique (barre de filtres et filtres avancés du web), appliqués en
 * direct : la liste derrière la feuille se met à jour, et le bouton du bas annonce le résultat.
 */
export function FiltersSheet() {
  const f = usePaFilters();
  const list = useStagingList(f);
  const { byId } = useDistributors();
  const { data: affaires } = useAffaires();
  const [minStockText, setMinStockText] = useState(f.minStockWh);
  const active = countPaFilters(f);

  const nego: NegoMode = f.hasNego ? 'has' : f.needsNego ? 'needs' : 'all';
  const affaireName =
    f.affaire && f.affaireId ? (affaires?.find((a) => a.uuid === f.affaireId)?.name ?? 'Affaire') : 'Toutes';
  const distributorName = f.distributorId ? (byId(f.distributorId)?.name ?? 'Fournisseur') : 'Tous';
  const stockSuppliers =
    f.stockDistributorIds.length === 0
      ? 'Entrepôt principal'
      : summarize(f.stockDistributorIds.map((id) => byId(id)?.name ?? id), 'Entrepôt principal');

  const reset = () => {
    resetPaFilters();
    setMinStockText('');
  };

  const total = list.total;
  const footerLabel =
    total === null ? 'Voir les résultats' : `Voir ${formatInteger(total)} résultat${total > 1 ? 's' : ''}`;

  return (
    <SheetScreen
      title={active > 0 ? `Filtres (${active})` : 'Filtres'}
      leading={{ label: 'Réinitialiser', onPress: reset, disabled: active === 0 }}
      closeLabel="Fermer"
      footer={<Button label={footerLabel} onPress={() => router.back()} />}
    >
      <SheetSection title="Analyse">
        <ChoiceField
          label="Statut"
          options={STATUS_OPTIONS}
          value={f.status}
          onChange={(status) => patchPaFilters({ status })}
        />
        <ChoiceField
          label="Viabilité"
          options={VIABILITY_OPTIONS}
          value={f.viability}
          onChange={(viability) => patchPaFilters({ viability })}
        />
        <ChoiceField
          label="Pays de la viabilité"
          options={COUNTRY_OPTIONS}
          value={f.country}
          onChange={(country) => patchPaFilters({ country })}
        />
        <ChoiceField
          label="Poids"
          options={WEIGHT_OPTIONS}
          value={f.weight}
          onChange={(weight) => patchPaFilters({ weight })}
        />
        <ChoiceField
          label="Négociation"
          options={NEGO_OPTIONS}
          value={nego}
          onChange={(mode) => patchPaFilters({ hasNego: mode === 'has', needsNego: mode === 'needs' })}
        />
        <TriStateField
          label="Ventes marketplace"
          labels={['Tous', 'Ventes > 0', 'Sans']}
          value={f.minSales ? true : null}
          onChange={(v) => patchPaFilters({ minSales: v === true })}
        />
      </SheetSection>

      <SheetSection title="Produit">
        <LinkRow label="Marques" value={summarize(f.brands, 'Toutes')} onPress={() => openPaPicker('brands')} />
        <LinkRow label="Tags" value={summarize(f.tags, 'Tous')} onPress={() => openPaPicker('tags')} />
        <LinkRow label="Affaire" value={affaireName} onPress={() => openPaPicker('affaires')} />
        <ChoiceField
          label="Conditionnement"
          options={CONDITIONING_OPTIONS}
          value={f.conditioning}
          onChange={(conditioning) => patchPaFilters({ conditioning })}
        />
        <TriStateField
          label="EAN"
          labels={['Tous', 'Avec', 'Sans']}
          value={toTri(f.hasEan)}
          onChange={(v) => patchPaFilters({ hasEan: fromTri(v) })}
        />
        <TriStateField
          label="Code eBat"
          labels={['Tous', 'Avec', 'Sans']}
          value={toTri(f.hasEbat)}
          onChange={(v) => patchPaFilters({ hasEbat: fromTri(v) })}
        />
        <TriStateField
          label="Amazon (ASIN)"
          labels={['Tous', 'Disponible', 'Absent']}
          value={toTri(f.hasAsin)}
          onChange={(v) => patchPaFilters({ hasAsin: fromTri(v) })}
        />
      </SheetSection>

      <SheetSection title="Stock">
        <TriStateField
          label="Stock quelque part"
          labels={['Tous', 'En stock', 'Sans']}
          value={f.inStock ? true : null}
          onChange={(v) => patchPaFilters({ inStock: v === true })}
        />
        <ChoiceField
          label="Disponibilité"
          options={STOCK_READINESS_OPTIONS}
          value={f.stockReadiness}
          onChange={(stockReadiness) =>
            patchPaFilters({ stockReadiness: stockReadiness as StagingFilters['stockReadiness'] })
          }
        />
        <LinkRow
          label="Stock chez"
          value={stockSuppliers}
          onPress={() => openPaPicker('stock-suppliers')}
        />
        <TextField
          label={f.stockDistributorIds.length > 0 ? 'Quantité minimale (entrepôt fournisseur)' : 'Quantité minimale (entrepôt principal)'}
          value={minStockText}
          onChangeText={(text) => {
            const digits = text.replace(/\D/g, '');
            setMinStockText(digits);
            patchPaFilters({ minStockWh: digits });
          }}
          placeholder="Aucune"
          keyboardType="number-pad"
          returnKeyType="done"
        />
      </SheetSection>

      <SheetSection title="Fournisseur">
        <LinkRow
          label="Fournisseur"
          value={distributorName}
          onPress={() => openPaPicker('distributors')}
        />
        {f.distributorId ? (
          <>
            <ChoiceField
              label="Voie de l'offre"
              options={OFFER_TRACK_OPTIONS}
              value={f.offerTrack}
              onChange={(offerTrack) => patchPaFilters({ offerTrack })}
            />
            <TriStateField
              label="Code fournisseur"
              labels={['Tous', 'Manquant', 'Présent']}
              value={f.missingCode ? true : null}
              onChange={(v) => patchPaFilters({ missingCode: v === true })}
            />
          </>
        ) : null}
      </SheetSection>
    </SheetScreen>
  );
}
