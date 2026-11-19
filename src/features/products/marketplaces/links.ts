import type { HubMarketplaceKey } from '@/types/hubProductMarketplaces';

/**
 * Lien ouvrable vers la fiche d'une marketplace (repris de `lib/hub/pricing/marketplace-links.ts`).
 * Amazon : `/dp/{ASIN}`, puis URL stockée, puis recherche EAN. Leroy Merlin : URL canonique, sinon
 * recherche SKU puis EAN. ManoMano : URL stockée, sinon recherche EAN. Les autres : URL stockée.
 */

const AMAZON_HOSTS: Record<string, string> = {
  FR: 'www.amazon.fr',
  BE: 'www.amazon.com.be',
  DE: 'www.amazon.de',
  IT: 'www.amazon.it',
  ES: 'www.amazon.es',
  UK: 'www.amazon.co.uk',
};

const MANOMANO_TLDS: Record<string, string> = { FR: 'fr', ES: 'es', IT: 'it' };

const CANONICAL_LEROY_MERLIN = /^https?:\/\/(www\.)?leroymerlin\.fr\/produits\/[^?#]+\.html/i;

function clean(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function amazonHost(country: string): string {
  return AMAZON_HOSTS[country.toUpperCase()] ?? AMAZON_HOSTS.FR!;
}

function leroyMerlinSearch(term: string | null | undefined): string | null {
  const cleaned = clean(term);
  return cleaned ? `https://www.leroymerlin.fr/search?q=${encodeURIComponent(cleaned)}` : null;
}

export function resolveMarketplaceProductUrl(params: {
  marketplace: HubMarketplaceKey;
  country: string;
  sku: string | null;
  ean: string | null;
  storedUrl: string | null;
}): string | null {
  const stored = clean(params.storedUrl) || null;
  const sku = clean(params.sku);
  const ean = clean(params.ean);

  if (params.marketplace === 'amazon') {
    if (sku) return `https://${amazonHost(params.country)}/dp/${encodeURIComponent(sku)}`;
    if (stored) return stored;
    return ean ? `https://${amazonHost(params.country)}/s?k=${encodeURIComponent(ean)}` : null;
  }
  if (params.marketplace === 'leroyMerlin') {
    if (stored && CANONICAL_LEROY_MERLIN.test(stored)) return stored;
    return leroyMerlinSearch(sku) ?? leroyMerlinSearch(ean);
  }
  if (params.marketplace === 'manoMano') {
    if (stored) return stored;
    if (!ean) return null;
    const tld = MANOMANO_TLDS[params.country.toUpperCase()] ?? 'fr';
    return `https://www.manomano.${tld}/recherche/${encodeURIComponent(ean)}`;
  }
  return stored;
}
