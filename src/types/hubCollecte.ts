/**
 * Types de la collecte entrepôt du HUB (`hub-app/collecte/*`), repris de
 * `front_externe_batipower/lib/types/hub-collecte.ts`.
 */

export type CollecteWarehouse = 'QG_BATIPOWER' | 'DOMBASLE' | 'FLEVY';

/** Seuils d'ancienneté du filtre : 0 = tous les colis non collectés. */
export type CollecteMinHours = 0 | 24 | 48 | 72;

/** Colis expédié non collecté, avec son ancienneté et l'état de son historique d'étiquettes. */
export type UncollectedColis = {
  orderReference: string;
  batrefReference: string;
  coliNumber: number;
  totalColis: number;
  carrier: string;
  noSuivi: string;
  dateImpression: string | null;
  dateExpedie: string;
  ageHours: number;
  /** Nombre d'étiquettes distinctes dans l'historique de la commande. */
  labelCount: number;
  /** Étiquette actuelle non scannée mais une ancienne étiquette de la commande l'a été. */
  collectedViaHistory: boolean;
  viaHistoryCollectedAt: string | null;
};

export type UncollectedStats = {
  total: number;
  over24h: number;
  over48h: number;
  over72h: number;
  viaHistory: number;
};

export type UncollectedResponse = {
  warehouse: CollecteWarehouse;
  minHours: CollecteMinHours;
  generatedAt: string;
  stats: UncollectedStats;
  rows: UncollectedColis[];
};

export type LabelPrintStatus = 'PRINTED' | 'TO_PRINT' | 'PDF' | 'UNKNOWN';

/** `TRACKING` : scan sur le n° de suivi ; `ORDER_REF` : scan enregistré sous la référence de la commande. */
export type LabelCollectedBy = 'TRACKING' | 'ORDER_REF';

export type OrderLabel = {
  trackingNumber: string;
  isCurrent: boolean;
  carrier: string | null;
  warehouse: string | null;
  printedAt: string | null;
  printCount: number;
  printStatus: LabelPrintStatus;
  collected: boolean;
  collectedBy: LabelCollectedBy | null;
  collectedAt: string | null;
  scanWarehouse: string | null;
};

export type OrderLabelsStatus = {
  reference: string;
  paymentStatus: string | null;
  dateExpedie: string | null;
  warehouse: string | null;
  labels: OrderLabel[];
  summary: {
    total: number;
    collected: number;
    currentCollected: boolean;
    collectedViaHistory: boolean;
  };
};

export type CarrierCheckState =
  | 'COLLECTED'
  | 'DELIVERED'
  | 'NOT_COLLECTED'
  | 'UNAVAILABLE'
  | 'UNSUPPORTED';

/** Contrôle en direct d'une étiquette auprès du transporteur (GLS ou DPD). */
export type LabelCarrierCheck = {
  trackingNumber: string;
  carrier: 'GLS' | 'DPD' | null;
  state: CarrierCheckState;
  lastStatus: string | null;
  lastEventAt: string | null;
};

/** Réponse des actions « Collecter » et « Livrer ». */
export type CollecteActionResult = {
  success: boolean;
  previousStatus: string | null;
  newStatus: string | null;
  changed: boolean;
  message: string;
};
