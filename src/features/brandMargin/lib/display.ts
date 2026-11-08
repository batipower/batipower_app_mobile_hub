import { formatEuroWhole, formatPercent } from '@/lib/format';
import type { Theme } from '@/theme';

import type { MarginView } from './model';

/** « +3,2 pt » / « -1,5 pt » ; « — » si l'écart est inconnu. */
export function formatPoints(gap: number | null | undefined): string {
  if (gap == null || !Number.isFinite(gap)) return '—';
  const text = Math.abs(gap).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  if (Math.round(Math.abs(gap) * 10) === 0) return `${text} pt`;
  return `${gap > 0 ? '+' : '-'}${text} pt`;
}

/** « +1 235 € » / « -300 € » : montant signé arrondi à l'euro. */
export function formatSignedEuro(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const text = formatEuroWhole(value);
  return value > 0 ? `+${text}` : text;
}

/** Taux de marge en % (« — » si inconnu). */
export function formatRate(rate: number | null | undefined): string {
  return formatPercent(rate, 1);
}

/** Couleur d'une marge : rouge si elle est négative, vert d'accent sinon. */
export function marginColor(t: Theme, value: number): string {
  return value < 0 ? t.danger : t.accentText;
}

/** Libellé de la vue (marge avec ou sans SAV). */
export function viewLabel(view: MarginView): string {
  return view === 'net' ? 'Avec SAV' : 'Sans SAV';
}

/** « 2026-03 » devient « mars 26 » (mois du graphique mensuel). */
export function formatMonthLabel(month: string, long = false): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  const date = new Date(y, m - 1, 1);
  const name = date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
  return long ? `${name} ${y}` : name;
}

/** `2026-03-05` devient `05/03/2026`. */
export function formatIsoDate(value: string | undefined): string {
  const [y, m, d] = (value ?? '').split('-');
  return y && m && d ? `${d}/${m}/${y}` : (value ?? '');
}
