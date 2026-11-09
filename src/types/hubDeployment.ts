import type { HubPricingRow } from '@/types/hubPricing';

/** Négociation liée au produit déployé (une ligne par distributeur). */
export interface HubDeploymentNegotiation {
  opportunityUuid: string;
  status: string;
  designation: string | null;
  distributorName: string | null;
  subsidiaryName: string | null;
  requestedPriceHT: number;
  proposedPriceHT: number | null;
  proposedByName: string | null;
  proposedByRole: string | null;
  proposedAt: string | null;
  obtainedPriceHT: number | null;
  gapHT: number | null;
  gapPercent: number | null;
  resolvedAt: string | null;
  launchedAt: string | null;
  attachedOnly: boolean;
}

export interface HubDeploymentChannel {
  sku: string | null;
  creationRequested: boolean;
}

/** Réponse de `GET hub-app/deployments/:reference` (SUPERADMIN). */
export interface HubDeployment {
  pricingRow: HubPricingRow;
  deployment: {
    launchedAt: string | null;
    firstDeployedAt: string | null;
    firstDeployedMarketplace: string | null;
    websiteDeployedAt: string | null;
    channels: {
      amazon: HubDeploymentChannel;
      manoMano: HubDeploymentChannel;
      leroyMerlin: HubDeploymentChannel;
    };
  };
  negotiations: HubDeploymentNegotiation[];
}
