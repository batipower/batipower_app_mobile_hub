/**
 * Types du paramétrage Distributeur > Entrepôt > Filiale et des comptes eBatPro, portés de
 * `front_externe_batipower/lib/types.ts` et `lib/api/admin.ts`.
 */
import type { PartnerLogo, Warehouse } from './admin';

export interface AdminSubsidiary extends PartnerLogo {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  emailSenderName: string | null;
  userCount: number;
  activeUserCount: number;
}

export interface AdminDistributorWarehouse {
  id: string;
  name: string;
  /** Code stable du catalogue d'entrepôts (valeur de l'enum si lié, généré sinon). */
  code?: string | null;
  /** Lien optionnel vers l'entrepôt historique ; null = entrepôt libre. */
  warehouse: Warehouse | null;
  /** Entrepôt dont celui-ci partage les DEP (ex. NANCY -> DOMBASLE) ; null = indépendant. */
  depSourceWarehouseId?: string | null;
  /** Faux = entrepôt désactivé (absent = actif). */
  isActive?: boolean;
  /** Identifiant Prestashop du statut « Paiement accepté - <entrepôt> ». */
  psOrderStateId?: number | null;
  /** Interrupteur fin : l'entrepôt reçoit de nouvelles commandes. */
  acceptsOrders?: boolean;
  ordersAffectationUpdatedAt?: string | null;
  ordersAffectationUpdatedBy?: string | null;
  /** Commandes affectées et pas terminées. */
  pendingOrders?: number;
  subsidiaries: AdminSubsidiary[];
}

/** Type d'expédition eBatPro : L livraison, D drive, E enlèvement. */
export type EbatShippingType = 'L' | 'D' | 'E';
/** Statut eBatPro qui termine la commande. */
export type EbatDoneStatus = 'shipped' | 'picked-up';

export interface WarehouseFlowConfig {
  shippingType: EbatShippingType;
  doneStatus: EbatDoneStatus;
  /** Gabarit du commentaire eBatPro ; contient `{reference}`. */
  comment: string;
}

export interface WarehousePalletFlowConfig {
  enabled: boolean;
  pickupWarehouseId: string | null;
  pickupWarehouseCode: string;
  /** Seuil TTC de candidature palette ; null = seuil global de l'agent. */
  minTotalTTC: number | null;
}

export interface WarehouseNearbyAgency {
  code: string;
  name: string;
  priority: number;
}

/** Configuration effective d'un entrepôt (valeurs en base, sinon valeurs par défaut du code). */
export interface AdminWarehouseConfig {
  warehouseId: string;
  code: string;
  customized: boolean;
  classic: WarehouseFlowConfig;
  pallet: WarehouseFlowConfig;
  palletFlow: WarehousePalletFlowConfig;
  agencies: { customized: boolean; nearby: WarehouseNearbyAgency[] };
  defaults: {
    classic: WarehouseFlowConfig;
    pallet: WarehouseFlowConfig;
    palletFlow: WarehousePalletFlowConfig;
    agencies: WarehouseNearbyAgency[];
  };
  commentPlaceholder: string;
  pickupOptions: { id: string; code: string; label: string; distributorName: string }[];
  updatedAt: string | null;
  updatedBy: string | null;
}

/** Corps de mise à jour : section absente = inchangée, `null` = retour aux valeurs par défaut. */
export interface UpdateWarehouseConfigInput {
  classic?: WarehouseFlowConfig | null;
  pallet?: WarehouseFlowConfig | null;
  palletFlow?: { enabled: boolean; pickupWarehouseId: string | null; minTotalTTC: number | null } | null;
  agencies?: { code: string; name: string }[] | null;
}

export interface AdminDistributor extends PartnerLogo {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  warehouses: AdminDistributorWarehouse[];
  subsidiaryCount: number;
  userCount: number;
  /** `ALL` = ouvertes + DEP (défaut) ; `DEP_ONLY` = uniquement ses DEP. */
  opportunityAccess?: 'ALL' | 'DEP_ONLY';
  depByWarehouse?: boolean;
  /** BFA / gain négocié, en fraction (0.02 = 2 %). */
  rebateRate?: number;
  ordersAffectationEnabled?: boolean;
  ordersAffectationUpdatedAt?: string | null;
  ordersAffectationUpdatedBy?: string | null;
  negoAutoDeployPaused?: boolean;
  negoAutoDeployPausedAt?: string | null;
  negoAutoDeployPausedBy?: string | null;
  negoPendingProposals?: number;
  /** Marge cible cachée (%) des opportunités standard (hors DEP), défaut 10. */
  negoMarginPct?: number;
  negoMarginUpdatedAt?: string | null;
  negoMarginUpdatedBy?: string | null;
  /** Remise (%) appliquée à la lecture au prix demandé de ses DEP, défaut 10. */
  depDiscountPct?: number;
  depDiscountUpdatedAt?: string | null;
  depDiscountUpdatedBy?: string | null;
  /** Remise SUPPLÉMENTAIRE (%) du prix d'achat demandé de ses DEP (distributeur DEP_ONLY), défaut 5. */
  depOnlyAskedDiscountPct?: number;
  depOnlyAskedDiscountUpdatedAt?: string | null;
  depOnlyAskedDiscountUpdatedBy?: string | null;
  ebatproSetup?: {
    ready: boolean;
    missing: ('WAREHOUSE' | 'EBAT_ACCOUNT')[];
    warnings: 'STORE_CODE'[];
  };
}

export interface AdminDistributorsPage {
  items: AdminDistributor[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UpdateDistributorPayload {
  name?: string;
  isActive?: boolean;
  logoNeedsLightBackground?: boolean;
  opportunityAccess?: 'ALL' | 'DEP_ONLY';
  depByWarehouse?: boolean;
  /** Fraction (0.02 = 2 %), entre 0 et 0.5 exclu. */
  rebateRate?: number;
}

export interface NegoMarginApplyResult {
  examined: number;
  updated: number;
  keptManual: number;
  unchanged: number;
  unusable: number;
  conflicts: number;
}

/** Recalcul des prix en tâche de fond après un changement de marge (relu par polling). */
export interface NegoMarginJob extends NegoMarginApplyResult {
  id: string;
  distributorId: string;
  status: 'RUNNING' | 'DONE' | 'FAILED';
  total: number;
  newMarginPct: number;
  error: string | null;
  requestedBy: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface EbatproAccount {
  id: string;
  label: string;
  login: string;
  hasPassword: boolean;
  warehouse: Warehouse | null;
  distributorWarehouseId: string | null;
  distributorWarehouseName: string | null;
  distributor: { id: string; name: string } | null;
  isActive: boolean;
  isDefault: boolean;
  erpStoreId: string | null;
  worksiteCode: string | null;
  lastLoginAt: string | null;
  lastLoginStatus: string | null;
  lastLoginError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EbatproAccountsResponse {
  /** false : EBATPRO_SECRET_KEY manquante côté serveur (création / édition impossibles). */
  encryptionAvailable: boolean;
  /** Entrepôts encore servis par les variables d'environnement. */
  envFallbackWarehouses: string[];
  accounts: EbatproAccount[];
}

export interface EbatproAccountCreatePayload {
  label: string;
  login: string;
  password: string;
  distributorWarehouseId: string;
  isActive?: boolean;
  isDefault?: boolean;
  erpStoreId?: string;
  worksiteCode?: string;
}

export interface EbatproAccountUpdatePayload {
  label?: string;
  login?: string;
  /** Absent ou vide : mot de passe inchangé. */
  password?: string;
  /** Chaîne vide : détacher du distributeur. */
  distributorWarehouseId?: string;
  isActive?: boolean;
  erpStoreId?: string;
  worksiteCode?: string;
}
