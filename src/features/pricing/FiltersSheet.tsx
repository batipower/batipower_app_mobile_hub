import { useState } from 'react';
import { router } from 'expo-router';

import { Button, TextField } from '@/components/ui';
import { formatInteger } from '@/lib/format';

import {
  ChoiceField,
  LinkRow,
  MultiChoiceField,
  StateField,
  TriStateField,
} from './components/FilterControls';
import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { countActiveFilters } from './filters';
import {
  patchPricingFilters,
  resetPricingFilters,
  setPricingCountry,
  usePricingState,
} from './filtersStore';
import { usePricingAffaires } from './hooks/usePricingOptions';
import { usePricingList } from './hooks/usePricingList';
import { openPricingPicker } from './navigation';
import {
  BUYBOX_DANGER_OPTIONS,
  CATEGORY_TYPE_OPTIONS,
  COUNTRY_FLAGS,
  MISSED_OPPORTUNITY_MARKETPLACES,
  MISSED_OPPORTUNITY_STOCKS,
  PRICING_COUNTRIES,
  RETURN_TYPE_FILTER_OPTIONS,
  SOLD_CHANNEL_OPTIONS,
  SOLD_DAYS_VALUES,
  SUPPLIER_ORDER_OPTIONS,
  WAREHOUSE_OPTIONS,
} from './options';
import type { PricingReturnTypeFilter, SoldChannel, SoldDays } from '@/types/hubPricing';

function summarize(values: string[], empty: string): string {
  if (values.length === 0) return empty;
  return values.length === 1 ? values[0]! : `${values.length} sélectionnés`;
}

/**
 * Tous les filtres de la liste Pricing (FilterBar et filtres avancés du web), appliqués en
 * direct : la liste derrière la feuille se met à jour, et le bouton du bas annonce le résultat.
 */
export function FiltersSheet() {
  const { filters, country } = usePricingState();
  const { affaires } = usePricingAffaires();
  const list = usePricingList(filters, country, true);
  const [minStockText, setMinStockText] = useState(
    filters.minStock != null ? String(filters.minStock) : '',
  );
  const active = countActiveFilters(filters);

  const affaireName = filters.affaireId
    ? (affaires.find((a) => a.uuid === filters.affaireId)?.name ?? 'Affaire')
    : 'Toutes';

  const reset = () => {
    resetPricingFilters();
    setMinStockText('');
  };

  const total = list.total;
  const footerLabel =
    total === null
      ? 'Voir les résultats'
      : `Voir ${formatInteger(total)} résultat${total > 1 ? 's' : ''}`;

  return (
    <SheetScreen
      title={active > 0 ? `Filtres (${active})` : 'Filtres'}
      leading={{ label: 'Réinitialiser', onPress: reset, disabled: active === 0 }}
      closeLabel="Fermer"
      footer={<ApplyButton label={footerLabel} />}
    >
      <SheetSection title="Général">
        <ChoiceField
          label="Pays affiché"
          options={PRICING_COUNTRIES.map((code) => ({
            value: code,
            label: `${COUNTRY_FLAGS[code]} ${code}`,
          }))}
          value={country}
          onChange={setPricingCountry}
        />
        <MultiChoiceField
          label="Services"
          options={CATEGORY_TYPE_OPTIONS}
          values={filters.categoryTypes}
          onChange={(categoryTypes) => patchPricingFilters({ categoryTypes })}
        />
        <LinkRow
          label="Marques"
          value={summarize(filters.brands, 'Toutes')}
          onPress={() => openPricingPicker('brands')}
        />
        <LinkRow
          label="Tags"
          value={summarize(filters.productTags, 'Tous')}
          onPress={() => openPricingPicker('tags')}
        />
        <LinkRow
          label="Affaire"
          value={affaireName}
          onPress={() => openPricingPicker('affaires')}
        />
        <ChoiceField
          label="Affectation"
          options={[{ value: '', label: 'Toutes' }, ...WAREHOUSE_OPTIONS]}
          value={filters.warehouse}
          onChange={(warehouse) => patchPricingFilters({ warehouse })}
        />
        <TriStateField
          label="Favoris"
          value={filters.favorite}
          onChange={(favorite) => patchPricingFilters({ favorite })}
        />
        <ChoiceField
          label="Commande fournisseur"
          options={SUPPLIER_ORDER_OPTIONS}
          value={filters.hasActiveSupplierOrder}
          onChange={(hasActiveSupplierOrder) => patchPricingFilters({ hasActiveSupplierOrder })}
        />
      </SheetSection>

      <SheetSection title="Stock">
        <TriStateField
          label="Avec stock"
          value={filters.hasStock}
          onChange={(hasStock) =>
            patchPricingFilters(hasStock === null ? { hasStock, stockWarehouse: '' } : { hasStock })
          }
        />
        {filters.hasStock !== null ? (
          <ChoiceField
            label="Entrepôt du stock"
            options={[{ value: '', label: 'Tous' }, ...WAREHOUSE_OPTIONS]}
            value={filters.stockWarehouse}
            onChange={(stockWarehouse) => patchPricingFilters({ stockWarehouse })}
          />
        ) : null}
        <TriStateField
          label="Stock interne"
          value={filters.hasInternalStock}
          onChange={(hasInternalStock) => patchPricingFilters({ hasInternalStock })}
        />
        <TextField
          label="Stock minimum"
          value={minStockText}
          onChangeText={(text) => {
            const digits = text.replace(/\D/g, '');
            setMinStockText(digits);
            const parsed = Number(digits);
            patchPricingFilters({ minStock: digits && parsed > 0 ? parsed : null });
          }}
          placeholder="Aucun"
          keyboardType="number-pad"
          returnKeyType="done"
        />
      </SheetSection>

      <SheetSection title="Statut">
        <TriStateField
          label="Surveillance BuyBox"
          labels={['Tous', 'Surveillés', 'Non surveillés']}
          value={filters.monitorBuyBox}
          onChange={(monitorBuyBox) => patchPricingFilters({ monitorBuyBox })}
        />
        <TriStateField
          label="Manutention"
          labels={['Tous', 'Bloqués', 'Non bloqués']}
          value={filters.handlingRestricted}
          onChange={(handlingRestricted) => patchPricingFilters({ handlingRestricted })}
        />
        <TriStateField
          label="Produit obsolète"
          labels={['Tous', 'Obsolètes', 'Non obsolètes']}
          value={filters.obsoletProduct}
          onChange={(obsoletProduct) => patchPricingFilters({ obsoletProduct })}
        />
        <TriStateField
          label="Non déployés sur le site"
          labels={['Tous', 'Oui', 'Non']}
          value={filters.notOnWebsite ? true : null}
          onChange={(value) => patchPricingFilters({ notOnWebsite: value === true })}
        />
        <TriStateField
          label="Vente à perte"
          labels={['Tous', 'Oui', 'Non']}
          value={filters.sellingAtLoss ? true : null}
          onChange={(value) => patchPricingFilters({ sellingAtLoss: value === true })}
        />
        <TriStateField
          label="Google Merchant"
          value={filters.hasGoogleMerchant}
          onChange={(hasGoogleMerchant) => patchPricingFilters({ hasGoogleMerchant })}
        />
      </SheetSection>

      <SheetSection title="BuyBox">
        <StateField
          label="Amazon"
          value={filters.buyBoxAmazon}
          onChange={(buyBoxAmazon) => patchPricingFilters({ buyBoxAmazon })}
        />
        <StateField
          label="ManoMano"
          value={filters.buyBoxManoMano}
          onChange={(buyBoxManoMano) => patchPricingFilters({ buyBoxManoMano })}
        />
        <StateField
          label="Leroy Merlin"
          value={filters.buyBoxLeroyMerlin}
          onChange={(buyBoxLeroyMerlin) => patchPricingFilters({ buyBoxLeroyMerlin })}
        />
        <StateField
          label="Castorama"
          value={filters.buyBoxCastorama}
          onChange={(buyBoxCastorama) => patchPricingFilters({ buyBoxCastorama })}
        />
      </SheetSection>

      <SheetSection title="Opportunités">
        <ChoiceField
          label="Opportunité manquée"
          options={MISSED_OPPORTUNITY_MARKETPLACES}
          value={filters.missedOpportunity}
          onChange={(missedOpportunity) =>
            patchPricingFilters(
              missedOpportunity
                ? { missedOpportunity }
                : { missedOpportunity, missedOpportunityStock: '' },
            )
          }
        />
        {filters.missedOpportunity ? (
          <ChoiceField
            label="avec stock"
            options={MISSED_OPPORTUNITY_STOCKS}
            value={filters.missedOpportunityStock}
            onChange={(missedOpportunityStock) => patchPricingFilters({ missedOpportunityStock })}
          />
        ) : null}
        <ChoiceField
          label="BuyBox en danger (à retirer)"
          options={BUYBOX_DANGER_OPTIONS}
          value={filters.buyboxToRemoveStock}
          onChange={(buyboxToRemoveStock) => patchPricingFilters({ buyboxToRemoveStock })}
        />
      </SheetSection>

      <SheetSection title="Dépréciation">
        <StateField
          label="Stock Flevy"
          labels={['Tous', 'Déprécié', 'Non déprécié']}
          value={filters.depreciatedFlevy}
          onChange={(depreciatedFlevy) => patchPricingFilters({ depreciatedFlevy })}
        />
        <StateField
          label="Stock Dombasle"
          labels={['Tous', 'Déprécié', 'Non déprécié']}
          value={filters.depreciatedDombasle}
          onChange={(depreciatedDombasle) => patchPricingFilters({ depreciatedDombasle })}
        />
      </SheetSection>

      <SheetSection title="Ventes et retours">
        <ChoiceField<SoldChannel | ''>
          label="Ventes par canal"
          options={[{ value: '', label: 'Aucun' }, ...SOLD_CHANNEL_OPTIONS]}
          value={filters.soldChannel}
          onChange={(soldChannel) =>
            patchPricingFilters(
              soldChannel
                ? { soldChannel, soldDays: filters.soldDays ?? 30 }
                : { soldChannel, soldDays: null, soldMode: 'with' },
            )
          }
        />
        {filters.soldChannel ? (
          <>
            <ChoiceField<SoldDays>
              label="Sur les derniers jours"
              options={SOLD_DAYS_VALUES.map((value) => ({ value, label: `${value} j` }))}
              value={filters.soldDays ?? 30}
              onChange={(soldDays) => patchPricingFilters({ soldDays })}
            />
            <ChoiceField
              label="Mode"
              options={[
                { value: 'with', label: 'Avec ventes' },
                { value: 'without', label: 'Sans vente' },
              ]}
              value={filters.soldMode}
              onChange={(soldMode) => patchPricingFilters({ soldMode })}
            />
          </>
        ) : null}
        <ChoiceField<PricingReturnTypeFilter | ''>
          label="Retours (7 derniers mois)"
          options={[{ value: '', label: 'Tous' }, ...RETURN_TYPE_FILTER_OPTIONS]}
          value={filters.returnType}
          onChange={(returnType) => patchPricingFilters({ returnType })}
        />
      </SheetSection>
    </SheetScreen>
  );
}

function ApplyButton({ label }: { label: string }) {
  return <Button label={label} onPress={() => router.back()} />;
}
