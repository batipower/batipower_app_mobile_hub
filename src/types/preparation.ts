/**
 * Types de la préparation HUB, sous-ensemble de
 * `front_externe_batipower/lib/types/hub-preparation.ts` et `hub-driver-tour.ts`
 * (réponses de `GET /hub-app/orders/preparation` et `.../preparation/drivers-tour`).
 */

export type PreparationScope = 'to-prepare' | 'shipped';

/** Filtres de la liste « à préparer ». */
export type StockFilter = 'all' | 'stock' | 'attente' | 'nonaffecte';

export interface PreparationOrderRow {
  uuid?: string;
  reference: string;
  name?: string | null;
  quantity: number;
  weightInGrams?: number | null;
}

export interface PreparationDeliveryAddress {
  firstname?: string | null;
  lastname?: string | null;
  address?: string | null;
  complt_address?: string | null;
  zipcode?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface PreparationWarehouseOrder {
  uuid?: string;
  warehouseAffectation?: string | null;
  forceNbColis?: number | null;
  tags?: string[];
  noSuivi?: string | null;
  status?: string;
}

export interface PreparationOrder {
  reference: string;
  ebatRef?: string | null;
  createdAt: string;
  origin?: string | null;
  paymentStatus?: string | null;
  dateExpedie?: string | null;
  nbColis: number;
  totalWeightInGrams: number;
  carrier?: { name?: string | null } | null;
  deliveryAddress?: PreparationDeliveryAddress | null;
  rows?: PreparationOrderRow[];
  warehouseOrder?: PreparationWarehouseOrder | null;
}

export interface PreparationOrdersResponse {
  scope: PreparationScope;
  count: number;
  orders: PreparationOrder[];
}

// ─── « À chercher en agence » ────────────────────────────────────────────────

export interface DriverTourItem {
  reference: string;
  productName: string;
  quantity: number;
}

export interface DriverTourAgency {
  warehouseCode: string;
  agencyName: string;
  priorityRank: number;
  totalOrders: number;
  totalReferences: number;
  totalPieces: number;
  items: DriverTourItem[];
}

export interface DriversTourResult {
  generatedAt: string;
  /** Commandes distinctes en attente livreur. */
  totalOrders: number;
  totalReferences: number;
  totalPieces: number;
  agencies: DriverTourAgency[];
}
