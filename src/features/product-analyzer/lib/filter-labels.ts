import type { StagingFilters } from '@/types/hubProductAnalyzer';
import { SR_CFG } from './constants';

export interface StagingChipDescriptor {
  key: string;
  label: string;
  /** Pastille de couleur sémantique (facultative). */
  dot?: string;
  /** Patch à appliquer pour retirer ce filtre. */
  clearPatch: Partial<StagingFilters>;
}

/** Patch qui remet tous les filtres de la liste staging à leur valeur par défaut. */
export const STAGING_RESET_PATCH: Partial<StagingFilters> = {
  status: '',
  viability: 'all',
  country: '',
  weight: '',
  hasNego: false,
  needsNego: false,
  hasEan: '',
  hasAsin: '',
  minSales: false,
  hasEbat: '',
  inStock: false,
  stockReadiness: '',
  minStockWh: '',
  stockDistributorIds: [],
  brands: [],
  tags: [],
  search: '',
  conditioning: '',
};

export function hasActiveStagingFilters(f: StagingFilters): boolean {
  return (
    f.status !== '' ||
    f.viability !== 'all' ||
    f.country !== '' ||
    f.weight !== '' ||
    f.hasNego ||
    f.needsNego ||
    f.hasEan !== '' ||
    f.hasAsin !== '' ||
    f.hasEbat !== '' ||
    f.minSales ||
    f.inStock ||
    f.stockReadiness !== '' ||
    f.minStockWh !== '' ||
    f.stockDistributorIds.length > 0 ||
    f.brands.length > 0 ||
    f.tags.length > 0 ||
    f.search !== '' ||
    f.conditioning !== ''
  );
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  LAUNCHED: 'Lancés',
  EBAT_NOT_FOUND: 'Introuvables',
};

const STOCK_READINESS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(SR_CFG).map(([key, cfg]) => [key, cfg.label]),
);

const VIABILITY_LABELS: Record<string, string> = {
  viable: 'Viable',
  negotiable: 'À négocier',
  not_viable: 'Non viable',
};

/** Libellés lisibles des filtres actifs de la liste staging (rangée de chips). */
export function buildStagingFilterChips(
  f: StagingFilters,
  /** Nom d'un distributeur à partir de son id (repli : l'id). */
  distributorName: (id: string) => string = (id) => id,
): StagingChipDescriptor[] {
  const chips: StagingChipDescriptor[] = [];
  const scoped = f.stockDistributorIds.length > 0;

  if (f.search.trim()) chips.push({ key: 'search', label: `Recherche : ${f.search}`, clearPatch: { search: '' } });
  if (f.viability !== 'all') {
    chips.push({
      key: 'viability',
      label: `Viabilité : ${VIABILITY_LABELS[f.viability] ?? f.viability}`,
      clearPatch: { viability: 'all' },
    });
  }
  if (f.status !== '') {
    chips.push({ key: 'status', label: `Statut : ${STATUS_LABELS[f.status] ?? f.status}`, clearPatch: { status: '' } });
  }
  if (f.country !== '') chips.push({ key: 'country', label: `Pays : ${f.country}`, clearPatch: { country: '' } });
  if (f.weight !== '') {
    chips.push({
      key: 'weight',
      label: f.weight === 'pending' ? 'Poids manquant' : 'Poids renseigné',
      clearPatch: { weight: '' },
    });
  }
  if (f.hasNego) chips.push({ key: 'hasNego', label: 'Négo en cours', dot: '#D97706', clearPatch: { hasNego: false } });
  if (f.needsNego) chips.push({ key: 'needsNego', label: 'Sans négo', dot: '#F97316', clearPatch: { needsNego: false } });
  if (f.minSales) chips.push({ key: 'minSales', label: 'Ventes > 0', dot: '#FF9900', clearPatch: { minSales: false } });
  if (f.brands.length > 0) {
    chips.push({
      key: 'brands',
      label: f.brands.length === 1 ? f.brands[0]! : `${f.brands.length} marques`,
      clearPatch: { brands: [] },
    });
  }
  if (f.hasEan !== '') {
    chips.push({ key: 'hasEan', label: f.hasEan === 'true' ? 'Avec EAN' : 'Sans EAN', dot: '#7C3AED', clearPatch: { hasEan: '' } });
  }
  if (f.hasEbat !== '') {
    chips.push({
      key: 'hasEbat',
      label: f.hasEbat === 'true' ? 'Avec code eBat' : 'Sans code eBat',
      dot: '#F59E0B',
      clearPatch: { hasEbat: '' },
    });
  }
  if (f.hasAsin !== '') {
    chips.push({
      key: 'hasAsin',
      label: f.hasAsin === 'true' ? 'Dispo Amazon' : 'Absent Amazon',
      dot: '#FF9900',
      clearPatch: { hasAsin: '' },
    });
  }
  if (f.conditioning !== '') {
    chips.push({
      key: 'conditioning',
      label: f.conditioning === 'multiple' ? 'Conditionnement multiple' : 'Conditionnement simple',
      clearPatch: { conditioning: '' },
    });
  }
  if (f.inStock) chips.push({ key: 'inStock', label: 'Stock quelque part (toutes agences)', clearPatch: { inStock: false } });
  if (f.stockReadiness !== '') {
    chips.push({
      key: 'stockReadiness',
      label: `Stock : ${STOCK_READINESS_LABELS[f.stockReadiness] ?? f.stockReadiness}`,
      clearPatch: { stockReadiness: '' },
    });
  }
  if (f.minStockWh !== '') {
    chips.push({
      key: 'minStockWh',
      label: scoped ? `Qté entrepôt fournisseur ≥ ${f.minStockWh}` : `Qté entrepôt principal ≥ ${f.minStockWh}`,
      clearPatch: { minStockWh: '' },
    });
  }
  if (scoped) {
    chips.push({
      key: 'stockDistributorIds',
      label: `Stock chez : ${f.stockDistributorIds.map(distributorName).join(', ')}`,
      dot: '#10B981',
      clearPatch: { stockDistributorIds: [] },
    });
  }
  if (f.tags.length > 0) {
    chips.push({
      key: 'tags',
      label: f.tags.length === 1 ? `Tag : ${f.tags[0]}` : `Tags : ${f.tags.join(', ')}`,
      dot: '#1D4ED8',
      clearPatch: { tags: [] },
    });
  }

  return chips;
}
