import type { PreparationDeliveryAddress, PreparationOrder } from '@/types/preparation';

import { STANDARD_TAGS, STOCK_QG_TAG } from './constants';

/**
 * Portage de `front_externe_batipower/lib/hub/preparation/order-helpers.ts` :
 * les règles de classement des commandes doivent rester identiques au web.
 */

function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isInterAgencyTag(tag: string): boolean {
  const n = normalizeTag(tag);
  return n.includes('inter agence') || n.includes('interagence');
}

export function isAgenceProcheTag(tag: string): boolean {
  const n = normalizeTag(tag);
  return n === 'agence proche' || n.includes('agence proche') || n.includes('agenceproche');
}

/** « En attente livreur » : la commande est servie depuis une agence proche. */
export function isOrderAwaitingDriver(order: PreparationOrder): boolean {
  return (order.warehouseOrder?.tags ?? []).some(isAgenceProcheTag);
}

/** « Non affecté » : pas de stock QG réservé pour cette commande. */
export function isOrderUnassigned(order: PreparationOrder): boolean {
  return !(order.warehouseOrder?.tags ?? []).includes(STOCK_QG_TAG);
}

export function getNbColis(order: PreparationOrder): number {
  return order.nbColis || order.warehouseOrder?.forceNbColis || 1;
}

export function getTotalWeight(order: PreparationOrder): number {
  if (typeof order.totalWeightInGrams === 'number') return order.totalWeightInGrams;
  return (order.rows ?? []).reduce(
    (total, row) => total + (row.weightInGrams || 0) * (row.quantity || 0),
    0,
  );
}

export function formatWeight(grams: number): string {
  if (grams === 0) return '—';
  return grams >= 1000 ? `${(grams / 1000).toFixed(1)} kg` : `${grams} g`;
}

export function getTotalPieces(order: PreparationOrder): number {
  return (order.rows ?? []).reduce((total, row) => total + (row.quantity || 0), 0);
}

export interface OrderTags {
  urgent: string[];
  custom: string[];
  hasInterAgency: boolean;
  awaitingDriver: boolean;
  stockQg: boolean;
}

export function splitOrderTags(tags: string[]): OrderTags {
  return {
    urgent: tags.filter((tag) => STANDARD_TAGS.has(tag)),
    custom: tags.filter(
      (tag) => !STANDARD_TAGS.has(tag) && !isInterAgencyTag(tag) && !isAgenceProcheTag(tag),
    ),
    hasInterAgency: tags.some((tag) => isInterAgencyTag(tag) || tag === 'COMMANDE INTER AGENCE'),
    awaitingDriver: tags.some(isAgenceProcheTag),
    stockQg: tags.includes(STOCK_QG_TAG),
  };
}

/** Âge lisible d'une commande : « 12 min », « 5 h », « 3 j ». */
export function ageLabel(iso: string, now = Date.now()): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '—';
  const minutes = Math.max(0, Math.floor((now - time) / 60_000));
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} j`;
}

export function formatDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function recipientName(address: PreparationDeliveryAddress | null | undefined): string {
  const name = [address?.firstname, address?.lastname]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  return name || 'Client inconnu';
}

export function cityLine(address: PreparationDeliveryAddress | null | undefined): string {
  return [address?.zipcode, address?.city]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
}

export function addressLines(address: PreparationDeliveryAddress | null | undefined): string[] {
  if (!address) return [];
  return [address.address, address.complt_address, cityLine(address), address.country]
    .map((line) => line?.trim())
    .filter((line): line is string => !!line);
}

/** Minuscules sans accents, pour une recherche tolérante (« Évry » trouve « evry »). */
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Texte de recherche d'une commande : référence, client, ville, référence eBat. */
export function orderSearchText(order: PreparationOrder): string {
  return normalizeForSearch(
    [
      order.reference,
      order.ebatRef,
      recipientName(order.deliveryAddress),
      order.deliveryAddress?.city,
      order.deliveryAddress?.zipcode,
    ]
      .filter(Boolean)
      .join(' '),
  );
}
