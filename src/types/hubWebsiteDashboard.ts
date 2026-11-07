/**
 * Vue « Site » de l'accueil HUB : contrat de `GET hub-app/dashboard/website` (SUPERADMIN), porté de
 * `front_externe_batipower/lib/types/hub-website-dashboard.ts`.
 */
export type WebsiteDashboardPeriod = '30d' | '90d' | '12m';

export type SiteQualityGrade = 'A' | 'B' | 'C' | 'D';

export interface SiteQuality {
  score: number;
  grade: SiteQualityGrade;
}

export interface WebsiteRatedProduct {
  reference: string;
  designation: string | null;
  score: number;
  grade: SiteQualityGrade;
}

export interface WebsiteDashboardQuality {
  /** Fiches actives sur le site déjà notées. */
  ratedCount: number;
  activeProducts: number;
  /** Produits actifs sans note. */
  unratedCount: number;
  /** Fiches en ligne mais introuvables sur PrestaShop (exclues des notes). */
  unresolvedCount: number;
  /** Moyenne des seules fiches notées ; `null` si aucune. */
  average: number | null;
  lowest: WebsiteRatedProduct | null;
  highest: WebsiteRatedProduct | null;
  gradeDistribution: Record<SiteQualityGrade, number>;
}

export interface WebsiteDashboardStock {
  indexedProducts: number;
  outOfStock: number;
  /** Part des ruptures dans le catalogue du site. */
  outOfStockPct: number | null;
  /** Produits actifs dont le stock site est forcé à 0 manuellement. */
  forcedZero: number;
}

export interface WebsiteDashboardCatalog {
  total: number;
  deployed: number;
  notDeployed: number;
  /** Part des non déployés dans le catalogue. */
  notDeployedPct: number | null;
}

export interface WebsiteServiceRow {
  /** `CategoryType` ou `AUCUN`. */
  service: string;
  deployed: number;
  notDeployed: number;
  total: number;
}

export interface WebsiteRankingRow {
  reference: string;
  designation: string | null;
  brand: string | null;
  service: string | null;
  websiteActive: boolean;
  quantity: number;
  orders: number;
  turnoverHT: number;
  realizedMarginHT: number | null;
  realizedMarginPct: number | null;
  realizedUnitMarginHT: number | null;
  currentPriceTTC: number | null;
  currentMarginHT: number | null;
  currentMarginPct: number | null;
  quality: SiteQuality | null;
}

export interface WebsiteDashboardReport {
  generatedAt: string;
  period: { key: WebsiteDashboardPeriod; days: number; from: string; to: string };
  quality: WebsiteDashboardQuality;
  /** `null` si l'index de recherche du site est injoignable. */
  stock: WebsiteDashboardStock | null;
  catalog: WebsiteDashboardCatalog;
  byService: WebsiteServiceRow[];
  siteOnlyRanking: WebsiteRankingRow[];
}
