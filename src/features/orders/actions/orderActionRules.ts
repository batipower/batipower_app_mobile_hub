import type { HubOrder } from '@/types/order';
import type {
  HubCancellationReasonCategory,
  HubOrderResendItem,
  WarehouseCatalogEntry,
} from '@/types/orderActions';

/**
 * Règles métier des actions de la fiche commande, portées de `front_externe_batipower`
 * (`lib/hub/order-display.ts`, `useHubOrderDetail.ts`, `HubModals/*`, `lib/hub/split-shipments.ts`,
 * `lib/warehouse-catalog.ts`). Fonctions pures : aucune dépendance React.
 */

/** Tag « commande urgente » de l'entrepôt (même libellé que le web et que le back). */
export const URGENT_TAG = 'COMMANDE URGENTE';

/** Entrepôt dont les annulations sont validées immédiatement (aucun logisticien externe). */
export const IMMEDIATE_CANCELLATION_WAREHOUSE = 'QG_BATIPOWER';

/** Texte enregistré quand le motif « client marketplace » est choisi sans texte libre (identique au back). */
export const MARKETPLACE_CUSTOMER_CANCELLATION_REASON = "Demande d'annulation par Marketplace";

export const CANCELLATION_REASON_LABELS: Record<HubCancellationReasonCategory, string> = {
  MARKETPLACE_CUSTOMER: 'Client marketplace',
  CUSTOMER_REQUEST: 'Demande du client',
  OUT_OF_STOCK: 'Rupture de stock',
  PRICE_ERROR: 'Erreur de prix',
  OTHER: 'Autre',
};

/** Renvoi interne (`…-RENVOI`, `…-PARTIEL-RENVOI`) : absent de PrestaShop. */
export function isResendReference(reference: string | null | undefined): boolean {
  return !!reference && /-(PARTIEL-)?RENVOI$/.test(reference);
}

/** Commande issue d'une marketplace : `origin` défini et différent de WEBSITE. */
export function isMarketplaceOrder(origin: string | null | undefined): boolean {
  return !!origin && origin !== 'WEBSITE';
}

/** Motifs proposés selon l'origine : le motif marketplace n'a de sens que hors site. */
export function cancellationReasonOptions(isMarketplace: boolean): HubCancellationReasonCategory[] {
  const all = Object.keys(CANCELLATION_REASON_LABELS) as HubCancellationReasonCategory[];
  return isMarketplace ? all : all.filter((reason) => reason !== 'MARKETPLACE_CUSTOMER');
}

export function isRefundedPaymentStatus(paymentStatus: string | null | undefined): boolean {
  const value = (paymentStatus ?? '').toLowerCase();
  return (
    value.includes('refund') ||
    value.includes('rembours') ||
    value.includes('avoir') ||
    value.includes('credit')
  );
}

export function isUrgentOrder(order: Pick<HubOrder, 'warehouseOrder'>): boolean {
  return order.warehouseOrder?.tags?.includes(URGENT_TAG) ?? false;
}

/** Commande déjà expédiée : statut de paiement « expédié », date d'expédition ou n° de suivi. */
export function isOrderShipped(order: HubOrder): boolean {
  return Boolean(
    /exp[ée]di/i.test(order.paymentStatus ?? '') ||
      order.dateExpedie ||
      order.warehouseOrder?.noSuivi,
  );
}

/** Split : pas déjà origine ni enfant d'un split. */
export function canSplitOrder(order: HubOrder): boolean {
  return !order.warehouseOrder?.isSplitOrigin && !order.warehouseOrder?.splitParentReference;
}

/** Fusion : origine d'un split avec au moins une commande enfant. */
export function canMergeOrder(order: HubOrder): boolean {
  return Boolean(
    order.warehouseOrder?.isSplitOrigin && (order.warehouseOrder.splitChildReferences?.length ?? 0) > 0,
  );
}

/** « Passer en Livré » : masqué si la commande est déjà livrée, annulée ou remboursée. */
export function canMarkOrderDelivered(order: HubOrder): boolean {
  const status = (order.paymentStatus ?? '').toLowerCase();
  return (
    !status.includes('livré') &&
    !status.includes('annul') &&
    !status.includes('cancel') &&
    !isRefundedPaymentStatus(order.paymentStatus)
  );
}

/** Nombre de colis proposé : forcé à la main > formulaire eBat > 1. */
export function initialParcelCount(order: HubOrder): number {
  return order.warehouseOrder?.forceNbColis || order.warehouseOrder?.ebatOrderForm?.nbColis || 1;
}

// ─── Poids de l'étiquette ────────────────────────────────────────────────────

/** Poids maximum accepté par l'API HUB pour une saisie manuelle (kg). */
export const MAX_MANUAL_WEIGHT_KG = 1000;

/** Poids global calculé : somme `poids unitaire × quantité` des lignes, en kg. */
export function computeOrderWeightKg(order: Pick<HubOrder, 'rows'>): number {
  const grams = (order.rows ?? []).reduce(
    (sum, row) => sum + (row.weightInGrams ?? 0) * (row.quantity ?? 1),
    0,
  );
  return Math.round(grams) / 1000;
}

export function initialWeightInput(computedKg: number): string {
  return computedKg > 0 ? String(computedKg) : '';
}

function parseDecimal(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Saisie valide : vide (= poids calculé) ou nombre dans ]0, MAX]. */
export function isWeightInputValid(value: string): boolean {
  if (value.trim() === '') return true;
  const parsed = parseDecimal(value);
  return parsed !== null && parsed > 0 && parsed <= MAX_MANUAL_WEIGHT_KG;
}

/** Poids à envoyer : `undefined` si le champ est vide ou égal au poids calculé. */
export function resolveWeightOverride(value: string, computedKg: number): number | undefined {
  if (!isWeightInputValid(value)) return undefined;
  const parsed = parseDecimal(value);
  if (parsed === null) return undefined;
  return Math.abs(parsed - computedKg) < 0.0005 ? undefined : parsed;
}

// ─── Assurance Ad Valorem (DPD) ──────────────────────────────────────────────

/** Valeur déclarée maximale acceptée par DPD / l'API HUB (EUR). */
export const MAX_AD_VALOREM_EUR = 20000;

/** Valeur initiale : prix d'achat HT fournisseur de la commande (vide s'il est inconnu). */
export function initialAdValoremInput(order: Pick<HubOrder, 'achatFournisseurRentabilityHT'>): string {
  const purchase = order.achatFournisseurRentabilityHT;
  return purchase != null && purchase > 0 ? String(Math.round(purchase * 100) / 100) : '';
}

export function isAdValoremInputValid(value: string): boolean {
  const parsed = parseDecimal(value);
  return parsed !== null && parsed > 0 && parsed <= MAX_AD_VALOREM_EUR;
}

export function resolveAdValoremValue(value: string): number | undefined {
  if (!isAdValoremInputValid(value)) return undefined;
  return Math.round((parseDecimal(value) as number) * 100) / 100;
}

/** Montant saisi en euros (virgule ou point) ; `null` si invalide. */
export function parseAmount(value: string): number | null {
  return parseDecimal(value);
}

// ─── Entrepôts cibles (transfert, annulation, split) ─────────────────────────

export interface WarehouseOption {
  value: string;
  label: string;
}

/** Repli tant que le catalogue n'est pas chargé (ou s'il échoue) : entrepôts historiques à stock. */
export const FALLBACK_TARGET_WAREHOUSES: WarehouseOption[] = [
  { value: 'FLEVY', label: 'Flevy' },
  { value: 'DOMBASLE', label: 'Dombasle' },
  { value: 'QG_BATIPOWER', label: 'QG Batipower' },
];

/**
 * Entrepôts pouvant RECEVOIR une commande : ceux que le back déclare prêts (`orderAffectationReady`).
 * Un lien secondaire d'un entrepôt historique (`FLEVY_2`) n'est pas une cible. `alwaysInclude` garde
 * l'entrepôt actuel de la commande même s'il n'accepte plus de nouvelles commandes.
 */
export function orderTargetOptions(
  entries: readonly WarehouseCatalogEntry[],
  alwaysInclude: readonly (string | null | undefined)[] = [],
): WarehouseOption[] {
  const keep = new Set(alwaysInclude.filter((code): code is string => !!code));
  return entries
    .filter((entry) => {
      if (entry.legacyEnum !== null && entry.code !== entry.legacyEnum) return false;
      if (keep.has(entry.code)) return true;
      if (entry.orderAffectationReady !== undefined) return entry.orderAffectationReady === true;
      return entry.legacyEnum !== null && (entry.capabilities ?? []).includes('STOCK_COLUMNS');
    })
    .map((entry) => ({ value: entry.code, label: entry.label }));
}

// ─── Split ───────────────────────────────────────────────────────────────────

export const MIN_SHIPMENTS = 2;
export const MAX_SHIPMENTS = 4;

/** Entrepôts par défaut des envois : l'entrepôt actuel d'abord, puis Dombasle / Flevy / les autres. */
export function defaultShipmentWarehouses(
  current: string | null | undefined,
  values: readonly string[],
  count: number,
): string[] {
  const pool = values.length > 0 ? values : ['FLEVY', 'DOMBASLE'];
  const preferred =
    current && pool.includes(current) ? current : pool.includes('FLEVY') ? 'FLEVY' : (pool[0] ?? 'FLEVY');
  const ordered = [preferred, ...['DOMBASLE', 'FLEVY', ...pool].filter((w) => pool.includes(w))].filter(
    (w, index, all) => all.indexOf(w) === index,
  );
  return ordered.slice(0, Math.max(1, count));
}

export function nextFreeWarehouse(values: readonly string[], used: readonly string[]): string | null {
  return values.find((w) => !used.includes(w)) ?? null;
}

/** Remplace un entrepôt devenu inéligible ou en doublon par le prochain entrepôt libre. */
export function repairShipmentWarehouses(
  chosen: readonly string[],
  targetValues: readonly string[],
): string[] {
  if (targetValues.length === 0) return [...chosen];
  const fixed: string[] = [];
  for (const warehouse of chosen) {
    if (targetValues.includes(warehouse) && !fixed.includes(warehouse)) {
      fixed.push(warehouse);
    } else {
      fixed.push(nextFreeWarehouse(targetValues, [...fixed, ...chosen]) ?? warehouse);
    }
  }
  return fixed;
}

/** Quantités initiales : toute la ligne dans l'envoi 1. */
export function allInFirstShipment(quantity: number, shipmentCount: number): number[] {
  return Array.from({ length: shipmentCount }, (_, i) => (i === 0 ? quantity : 0));
}

/**
 * Fixe la quantité de l'envoi `index` en gardant la somme constante : l'écart est pris à d'autres
 * envois (l'envoi 1 puis les suivants ; pour l'envoi 1, le dernier d'abord) et, en cas de baisse,
 * rendu au premier d'entre eux.
 */
export function setShipmentQuantity(
  quantities: readonly number[],
  index: number,
  value: number,
): number[] {
  const next = [...quantities];
  if (next.length < 2 || index < 0 || index >= next.length) return next;
  const current = next[index] ?? 0;
  const others = next.map((_, i) => i).filter((i) => i !== index);
  const order = index === 0 ? [...others].reverse() : others;
  const available = others.reduce((sum, i) => sum + (next[i] ?? 0), 0);
  const clamped = Math.max(0, Math.min(Math.trunc(value) || 0, current + available));
  let delta = clamped - current;
  if (delta < 0) {
    const first = order[0];
    if (first !== undefined) next[first] = (next[first] ?? 0) - delta;
  } else {
    for (const i of order) {
      const taken = Math.min(delta, next[i] ?? 0);
      next[i] = (next[i] ?? 0) - taken;
      delta -= taken;
      if (delta <= 0) break;
    }
  }
  next[index] = clamped;
  return next;
}

export function addShipmentQuantity(quantities: readonly number[]): number[] {
  return [...quantities, 0];
}

/** Retire l'envoi `index` (jamais le premier) : ses quantités reviennent à l'envoi 1. */
export function removeShipmentQuantity(quantities: readonly number[], index: number): number[] {
  if (index <= 0 || index >= quantities.length) return [...quantities];
  const next = [...quantities];
  next[0] = (next[0] ?? 0) + (next[index] ?? 0);
  next.splice(index, 1);
  return next;
}

/** Lignes de chaque envoi à partir des quantités par ligne (les lignes à 0 sont omises). */
export function buildShipmentLines(
  rows: readonly { reference: string; quantity: number }[],
  quantities: Record<string, number[]>,
  shipmentCount: number,
): HubOrderResendItem[][] {
  const groups: HubOrderResendItem[][] = Array.from({ length: shipmentCount }, () => []);
  for (const row of rows) {
    const split = quantities[row.reference] ?? allInFirstShipment(row.quantity, shipmentCount);
    split.forEach((quantity, position) => {
      if (quantity > 0 && groups[position]) {
        groups[position].push({ reference: row.reference, quantity });
      }
    });
  }
  return groups;
}
