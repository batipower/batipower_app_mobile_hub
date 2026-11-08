/**
 * Produits du module PARTNER (`buyer-app/products/*`), alignés sur `Product`, `DepProduct` et
 * `ProductMessage` de `front_externe_batipower/lib/types.ts`, limités aux champs affichés.
 */

export type PartnerNiveauCriticite = 'A' | 'B' | 'C';

/** Entrepôts du périmètre DEP (déstockage fournisseur). */
export type PartnerDepWarehouse = 'FLEVY' | 'DOMBASLE';

export interface PartnerProduct {
  uuid: string;
  reference: string;
  /** Miniature (JPEG en base64, souvent une data URL complète) ; souvent absente de la liste. */
  thumbnailBase64?: string | null;
  designation: string | null;
  brand: string | null;
  categoryType: string | null;
  obsoletProduct: boolean;
  warehouseDombasleStock: number | null;
  needsAppro: boolean;
  /** A = critique (< 4 sem), B = urgent (4 à 8 sem), C = normal. */
  niveauCriticite: PartnerNiveauCriticite | null;
  couvertureEnSemaines: number | null;
  venteMoyenne3mois: number | null;
  aRenegocier?: boolean;
  /** Prix d'achat fixe HT. Masqué (null) pour certains rôles. */
  fixPriceHT?: number | null;
  ruptureNbDays?: number | null;
  messagesCount?: number;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  lastMessageAuthorName?: string | null;
  lastMessageAwaitingReply?: boolean;
  /** Le dernier message attend une réponse du compte connecté. */
  awaitingReplyFromMe?: boolean;
}

/** Données DEP d'un distributeur sur une ligne. */
export interface PartnerDepDistributorInfo {
  distributorId: string;
  name: string | null;
  stock: number | null;
  purchasePriceHT: number | null;
  depSince: string | null;
}

export interface PartnerDepProduct extends PartnerProduct {
  depDistributors?: PartnerDepDistributorInfo[];
  depWarehouses: string[];
  depSince: string | null;
  remainingStock: number | null;
  warehouseFlevyStock: number | null;
}

export interface PartnerProductDetail extends PartnerProduct {
  ean: string | null;
  warehouseFlevyStock: number | null;
  lastInventoryDombasle: string | null;
  lastInventoryFlevy: string | null;
  venteMoyenne6mois: number | null;
  /** Date de livraison fournisseur de la commande de la semaine. */
  reapproActuel: {
    commandeFournisseur: boolean;
    quantiteCommandee: number | null;
    dateLivraisonPrevue: string | null;
  } | null;
}

export interface PartnerProductDetailResponse {
  product: PartnerProductDetail;
}

export interface PartnerPaginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PartnerProductMessage {
  id: string;
  productReference: string;
  authorUserId: string;
  authorName: string;
  authorRole: string | null;
  targetName: string | null;
  /** Vrai tant que la personne ciblée n'a pas répondu. */
  awaitingReply: boolean;
  content: string;
  createdAt: string;
}

export interface PartnerProductFacets {
  brands: string[];
  categoryTypes: string[];
}
