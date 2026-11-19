import type { ReactNode } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { SheetScreen } from '@/components/sheet/SheetScreen';
import { ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import type { HubMarketplaceKey, HubProductPricing } from '@/types/hubProductMarketplaces';
import type { HubProductHeader } from '@/types/product';

import { useProductDetail } from '../../hooks/useProductDetail';
import { isHubMarketplaceKey, marketplaceConfig, type MarketplaceConfigEntry } from '../config';
import { useProductPricing } from '../hooks/useProductPricing';
import { buildMarketplaceViewModel, type MarketplaceCountryView } from '../viewModel';

export type SheetParams = {
  reference: string;
  marketplace: HubMarketplaceKey;
  country: string;
};

export type SheetData = {
  reference: string;
  config: MarketplaceConfigEntry;
  pricing: HubProductPricing;
  header: HubProductHeader | null;
  view: MarketplaceCountryView;
};

/** Lit les paramètres communs aux feuilles marketplace ; `null` si l'un est invalide. */
export function useSheetParams(): SheetParams | null {
  const params = useLocalSearchParams<{ reference?: string; marketplace?: string; country?: string }>();
  if (!params.reference || !isHubMarketplaceKey(params.marketplace)) return null;
  return {
    reference: params.reference,
    marketplace: params.marketplace,
    country: params.country || 'FR',
  };
}

type Props = {
  title: string;
  params: SheetParams;
  /** Rendu une fois prix et en-tête chargés (les valeurs initiales du formulaire en dépendent). */
  children: (data: SheetData) => ReactNode;
};

/**
 * Charge (depuis le cache de la fiche, donc presque instantanément) les prix et l'en-tête du
 * produit, puis affiche la feuille ; sinon un squelette ou l'erreur dans une feuille vide.
 */
export function MarketplaceSheetData({ title, params, children }: Props) {
  const pricingQuery = useProductPricing(params.reference, true);
  const { header, headerLoading } = useProductDetail(params.reference, true);
  const pricing = pricingQuery.data;

  if (pricing && (header || !headerLoading)) {
    const config = marketplaceConfig(params.marketplace);
    const model = buildMarketplaceViewModel(pricing, params.marketplace, header?.ean ?? null);
    const view = model.countries.find((entry) => entry.country === params.country) ?? model.countries[0]!;
    return <>{children({ reference: params.reference, config, pricing, header, view })}</>;
  }

  return (
    <SheetScreen title={title} closeLabel="Annuler">
      {pricingQuery.isPending && !pricingQuery.error ? (
        <ListSkeleton rows={1} height={140} />
      ) : (
        <ErrorBanner
          error={pricingQuery.error}
          fallback="Impossible de charger les marketplaces"
          onRetry={() => void pricingQuery.refetch()}
        />
      )}
    </SheetScreen>
  );
}
