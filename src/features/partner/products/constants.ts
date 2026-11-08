import type { BadgeTone } from '@/components/ui';
import type { PartnerNiveauCriticite } from '@/types/partnerProducts';

/** Niveau de criticité du stock : A < 4 semaines de couverture, B de 4 à 8, C au-delà. */
export const CRITICITE_META: Record<PartnerNiveauCriticite, { label: string; tone: BadgeTone }> = {
  A: { label: 'Critique', tone: 'red' },
  B: { label: 'Urgent', tone: 'amber' },
  C: { label: 'Normal', tone: 'green' },
};

export const CRITICITE_ORDER: readonly PartnerNiveauCriticite[] = ['A', 'B', 'C'];

/** Entrepôts du périmètre DEP, avec le libellé affiché. */
export const DEP_WAREHOUSES = [
  { value: 'FLEVY', label: 'Flevy' },
  { value: 'DOMBASLE', label: 'Dombasle' },
] as const;

export function warehouseLabel(code: string | null | undefined): string {
  if (!code) return '—';
  const known = DEP_WAREHOUSES.find((warehouse) => warehouse.value === code);
  if (known) return known.label;
  return code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, ' ');
}

/** Couverture de stock : « 3,2 sem. » ; « — » si inconnue. */
export function formatWeeks(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value)} sem.`;
}
