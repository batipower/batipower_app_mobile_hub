import type {
  BuyBoxMarketplace,
  StagingSortByApi,
  StagingStatus,
  StockReadiness,
  ViabilityStatus,
  WeightSource,
} from '@/types/hubProductAnalyzer';

export const STAGING_PAGE_SIZE = 15;
export const LAUNCH_FROM_STAGING_TITLE_MAX = 128;

export const STEPS_DEF: { key: string; label: string; aiLabel: string }[] = [
  { key: '0', label: 'Vérification catalogue', aiLabel: 'Scan du catalogue interne...' },
  { key: '1', label: 'Interrogation Ebatpro', aiLabel: 'Extraction données fournisseur...' },
  { key: '2', label: 'Résolution EAN → ASIN', aiLabel: 'Recherche correspondance Amazon...' },
  { key: '2b_manomano', label: 'Recherche ManoMano', aiLabel: 'Recherche EAN ManoMano...' },
  { key: '2c_leroymerlin', label: 'Recherche Leroy Merlin', aiLabel: 'Recherche EAN Leroy Merlin...' },
  { key: '2d_castorama', label: 'Recherche Castorama', aiLabel: 'Recherche EAN Castorama...' },
  { key: '3_weight', label: 'Recherche du poids', aiLabel: 'IA analyse le poids produit...' },
  { key: '3_transport', label: 'Calcul transport', aiLabel: 'Calcul coût logistique...' },
  { key: '4_start', label: 'Analyse des ventes sur les marchés européens', aiLabel: 'Analyse ventes européennes...' },
  { key: '5', label: 'Prix cibles', aiLabel: 'Calcul matrice de prix...' },
  { key: '6', label: 'Sauvegarde', aiLabel: 'Enregistrement résultats...' },
];

export const MONTHLY_POTENTIAL_SORT_OPTIONS: { key: StagingSortByApi; label: string; flag: string }[] = [
  { key: 'monthlyPotential', label: 'Tous pays', flag: '🌍' },
  { key: 'monthlyPotentialFR', label: 'France', flag: '🇫🇷' },
  { key: 'monthlyPotentialDE', label: 'Allemagne', flag: '🇩🇪' },
  { key: 'monthlyPotentialIT', label: 'Italie', flag: '🇮🇹' },
  { key: 'monthlyPotentialES', label: 'Espagne', flag: '🇪🇸' },
  { key: 'monthlyPotentialUK', label: 'Royaume-Uni', flag: '🇬🇧' },
];

export const MP_KEYS = ['FR', 'DE', 'IT', 'ES', 'UK'] as const;
export const MP_FLAGS: Record<string, string> = { FR: '🇫🇷', DE: '🇩🇪', IT: '🇮🇹', ES: '🇪🇸', UK: '🇬🇧' };
export const MP_NAMES: Record<string, string> = {
  FR: 'France',
  DE: 'Allemagne',
  IT: 'Italie',
  ES: 'Espagne',
  UK: 'Royaume-Uni',
};
export const MP_DOMAINS: Record<string, string> = {
  FR: 'amazon.fr',
  DE: 'amazon.de',
  IT: 'amazon.it',
  ES: 'amazon.es',
  UK: 'amazon.co.uk',
};

export const MANOMANO_TLD_BY_COUNTRY: Record<string, string> = { FR: 'fr', ES: 'es', IT: 'it' };

export function getAmazonUrl(country: string, asin: string) {
  return `https://www.${MP_DOMAINS[country]}/dp/${asin}`;
}

export function getManomanoUrl(productId: number, country = 'FR') {
  const tld = MANOMANO_TLD_BY_COUNTRY[country.toUpperCase()] ?? 'fr';
  return `https://www.manomano.${tld}/p/produit-${productId}`;
}

export function getLeroyMerlinUrl(sku: string) {
  const cleaned = sku.trim();
  if (!cleaned) return '';
  return `https://www.leroymerlin.fr/search?q=${encodeURIComponent(cleaned)}`;
}

export function getCastoramaUrl(sku: string) {
  return `https://www.castorama.fr/mkp/p/${sku}.prd`;
}

export const WS_CFG: Record<WeightSource, { label: string; color: string }> = {
  ebatpro: { label: 'ERP', color: '#94C83D' },
  amazon: { label: 'Amazon', color: '#3B82F6' },
  amazon_shipping: { label: 'Amz Ship.', color: '#3B82F6' },
  amazon_specs: { label: 'Amz Specs', color: '#3B82F6' },
  amazon_description: { label: 'Amz Desc.', color: '#60A5FA' },
  amazon_de: { label: 'Amazon DE', color: '#2563EB' },
  amazon_it: { label: 'Amazon IT', color: '#2563EB' },
  amazon_es: { label: 'Amazon ES', color: '#2563EB' },
  spapi_catalog: { label: 'SP-API', color: '#8B5CF6' },
  gemini_web: { label: 'Web IA', color: '#F59E0B' },
  operator: { label: 'Manuel', color: '#F97316' },
  unknown: { label: 'Inconnu', color: '#EF4444' },
};

export const CONFIDENCE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Confirmé', color: '#16A34A', bg: '#DCFCE7' },
  single_source: { label: '1 source', color: '#D97706', bg: '#FEF3C7' },
  divergent: { label: 'Divergent', color: '#DC2626', bg: '#FEE2E2' },
  high: { label: 'Haute', color: '#16A34A', bg: '#DCFCE7' },
  medium: { label: 'Moyenne', color: '#D97706', bg: '#FEF3C7' },
  low: { label: 'Faible', color: '#DC2626', bg: '#FEE2E2' },
};

/**
 * Disponibilité du stock — mêmes mots dans le badge de la liste, le filtre, les chips et les tooltips.
 * `label` : libellé complet (filtre, chips). `shortLabel` : badge compact. `desc` : explication.
 */
export const SR_CFG: Record<
  StockReadiness,
  { label: string; shortLabel: string; color: string; bgColor: string; borderColor: string; desc: string }
> = {
  STOCK_OK: {
    label: 'En stock entrepôt',
    shortLabel: 'Entrepôt',
    color: '#16A34A',
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    desc: "Du stock est disponible dans l'entrepôt principal : expédiable tout de suite.",
  },
  TRANSFER_NEARBY: {
    label: 'Transfert agence proche (J+1)',
    shortLabel: 'Agence proche',
    color: '#CA8A04',
    bgColor: '#FEFCE8',
    borderColor: '#FEF08A',
    desc: "Rien dans l'entrepôt, mais du stock dans une agence proche : transfert rapide (J+1).",
  },
  TRANSFER_OTHER: {
    label: 'Transfert autre agence',
    shortLabel: 'Autre agence',
    color: '#EA580C',
    bgColor: '#FFF7ED',
    borderColor: '#FED7AA',
    desc: "Rien dans l'entrepôt ni en agence proche, mais du stock dans une autre agence : transfert plus lent.",
  },
  ORDER_NEEDED: {
    label: 'Rupture — à commander',
    shortLabel: 'À commander',
    color: '#DC2626',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    desc: 'Aucun stock nulle part : commande fournisseur nécessaire.',
  },
};

/** Ordre d'affichage des disponibilités dans le filtre stock. */
export const SR_FILTER_ORDER: StockReadiness[] = ['STOCK_OK', 'TRANSFER_NEARBY', 'TRANSFER_OTHER', 'ORDER_NEEDED'];

/**
 * Vocabulaire unique des prix d'achat (PA) de la liste.
 * Côté API, `recommendedBuyPrice` = PA d'équilibre : prix d'achat HT maximum pour ne pas perdre d'argent
 * (commission Amazon 15 % + frais de service, transport, marge 0 %).
 */
export const PA_LABELS = {
  current: 'PA actuel',
  estimated: 'PA estimé',
  max: 'PA max (équilibre)',
  maxShort: 'PA max',
  gap: 'Écart à négocier',
  nego: 'Prix négo demandé',
} as const;

export const PA_DEFINITIONS = {
  current: "Prix d'achat HT confirmé par le fournisseur (EbatPro).",
  estimated: "Prix d'achat HT non confirmé (aucune référence EbatPro rattachée) : à confirmer.",
  max: "Prix d'achat HT maximum à ne pas dépasser pour ne pas perdre d'argent : prix de vente HT − commission Amazon 15 % (+3 % de frais de service) − transport.",
  gap: 'PA actuel − PA max : ce qu’il faut obtenir de baisse auprès du fournisseur pour atteindre l’équilibre.',
  nego: 'Prix brut demandé dans la négociation en cours (cliquer pour le modifier).',
} as const;

/** Taux de référence du calcul de marge côté API (`DEFAULT_RATES`). */
export const REF_COMMISSION_PCT = 15;

export const VIAB = [
  { min: 12, color: '#16A34A', label: 'Excellente' },
  { min: 7, color: '#94C83D', label: 'Viable' },
  { min: 3, color: '#F59E0B', label: 'Limite' },
  { min: 0, color: '#F97316', label: 'Risqué' },
  { min: -Infinity, color: '#EF4444', label: 'Non viable' },
];

export const VIAB_STATUS_CFG: Record<ViabilityStatus, { color: string; label: string }> = {
  VIABLE: { color: '#22c55e', label: 'Viable' },
  NEGOTIABLE: { color: '#f59e0b', label: 'À négocier' },
  NOT_VIABLE: { color: '#ef4444', label: 'Non viable' },
};

export const STATUS_LABELS: Record<StagingStatus, string> = {
  PENDING: 'En attente',
  VALIDATED: 'Validé',
  REJECTED: 'Rejeté',
  LAUNCHED: 'Lancé',
  EBAT_NOT_FOUND: 'Introuvable EbatPro',
};

export const PLATFORM_LABELS: Record<BuyBoxMarketplace, string> = {
  AMAZON: 'Amazon',
  MANOMANO: 'ManoMano',
  LEROY_MERLIN: 'Leroy Merlin',
  BRICOMAN: 'Bricoman',
  CASTORAMA: 'Castorama',
  CDISCOUNT: 'Cdiscount',
  WEBSITE: 'Site web',
};

export const PLATFORM_COLORS: Record<BuyBoxMarketplace, string> = {
  AMAZON: '#FF9900',
  MANOMANO: '#FF6B35',
  LEROY_MERLIN: '#00A651',
  BRICOMAN: '#1E3A5F',
  CASTORAMA: '#E30613',
  CDISCOUNT: '#00A4DB',
  WEBSITE: '#6366F1',
};

export const ALL_PLATFORMS: BuyBoxMarketplace[] = [
  'AMAZON',
  'MANOMANO',
  'LEROY_MERLIN',
  'BRICOMAN',
  'CASTORAMA',
  'CDISCOUNT',
  'WEBSITE',
];

export const SERVICE_FEE_PERCENT = 3;
export const COMMISSIONS = [13, 14, 15] as const;
export const MARGES = [0, 5, 7, 10, 12] as const;
