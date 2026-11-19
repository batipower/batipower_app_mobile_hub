import type { HubBuyboxCompetitor, HubBuyboxData } from '@/types/hubProductMarketplaces';

/** Au-delà de ce délai, la capture de la BuyBox est signalée comme périmée. */
export const BUYBOX_STALE_MS = 48 * 3_600_000;

export interface BuyboxCompetitorView {
  sellerName: string | null;
  priceTTC: number;
  shippingCostTTC: number | null;
  totalTTC: number;
  deliveryDays: string | null;
  deliveryOrigin: string | null;
}

export interface BuyboxDetails {
  /** Frais de port de notre BuyBox : `null` = inconnu, `0` = offert. */
  shippingCostTTC: number | null;
  deliveryDays: string | null;
  deliveryOrigin: string | null;
  rating: number | null;
  reviewCount: number | null;
  capturedAt: string | null;
  manoManoExpress: boolean;
  firstCompetitor: BuyboxCompetitorView | null;
  fastestSeller: BuyboxCompetitorView | null;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : (value as number);
  return typeof num === 'number' && Number.isFinite(num) ? num : null;
}

function toText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** « 2j », « 2-3j » ; `null` si aucun délai n'est connu. */
function formatDeliveryDays(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return min === max ? `${min}j` : `${min}-${max}j`;
  return `${min ?? max}j`;
}

function readCompetitor(value: HubBuyboxCompetitor | null | undefined): BuyboxCompetitorView | null {
  if (!value) return null;
  const priceTTC = toNumber(value.priceTTC);
  if (priceTTC == null) return null;
  const shippingCostTTC = toNumber(value.shippingCostTTC);
  return {
    sellerName: toText(value.sellerName),
    priceTTC,
    shippingCostTTC,
    totalTTC: priceTTC + (shippingCostTTC ?? 0),
    deliveryDays: formatDeliveryDays(toNumber(value.deliveryDaysMin), toNumber(value.deliveryDaysMax)),
    deliveryOrigin: toText(value.deliveryDaysOrigin),
  };
}

function readCapturedAt(value: unknown): string | null {
  const text = toText(value);
  if (!text) return null;
  return Number.isNaN(new Date(text).getTime()) ? null : text;
}

/** Normalise le JSON brut d'une BuyBox (France ou pays) en infos prêtes à afficher, sans `NaN`. */
export function readBuyboxDetails(buybox: HubBuyboxData | null | undefined): BuyboxDetails {
  return {
    shippingCostTTC: toNumber(buybox?.shippingCostTTC),
    deliveryDays: formatDeliveryDays(
      toNumber(buybox?.deliveryDaysMin),
      toNumber(buybox?.deliveryDaysMax),
    ),
    deliveryOrigin: toText(buybox?.deliveryDaysOrigin),
    rating: toNumber(buybox?.customerRating),
    reviewCount: toNumber(buybox?.reviewCount),
    capturedAt: readCapturedAt(buybox?.capturedAt),
    manoManoExpress: buybox?.manomanoexpress === true,
    firstCompetitor: readCompetitor(buybox?.firstCompetitor),
    fastestSeller: readCompetitor(buybox?.fastestSeller),
  };
}

/** Écart de prix TTC avec un concurrent (positif = nous sommes plus chers) ; `null` si un prix manque. */
export function gapVsCompetitor(
  ourPriceTTC: number | null,
  competitor: BuyboxCompetitorView | null,
): number | null {
  if (ourPriceTTC == null || !competitor) return null;
  return Math.round((ourPriceTTC - competitor.priceTTC) * 100) / 100;
}

export function isCaptureStale(capturedAt: string | null, now = Date.now()): boolean {
  if (!capturedAt) return false;
  return now - new Date(capturedAt).getTime() > BUYBOX_STALE_MS;
}
