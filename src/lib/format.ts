/** Formats d'affichage partagés (dates, montants), en français. */

function toDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** « 12 nov. 2026, 14:32 » ; `null` si la date est absente ou invalide. */
export function formatDateTime(iso: string | null | undefined): string | null {
  const date = toDate(iso);
  return date ? date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : null;
}

/** « 12 nov. 2026 » ; `null` si la date est absente ou invalide. */
export function formatDate(iso: string | null | undefined): string | null {
  const date = toDate(iso);
  return date ? date.toLocaleDateString('fr-FR', { dateStyle: 'medium' }) : null;
}

/** « à l'instant », « il y a 5 min », « il y a 3 h », « hier », « il y a 4 j », puis la date. */
export function formatRelative(iso: string | null | undefined, now = Date.now()): string | null {
  const date = toDate(iso);
  if (!date) return null;
  const minutes = Math.floor((now - date.getTime()) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} j`;
  return formatDate(iso);
}

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

/** « 1 234,50 € » ; « — » si le montant est absent ou invalide. */
export function formatEuro(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—';
  const amount = Number(value);
  return Number.isFinite(amount) ? euro.format(amount) : '—';
}

/** TVA France (20 %), identique au coefficient utilisé par le web et le back pour dériver le HT. */
const FR_VAT_RATE = 1.2;

/** Prix HT déduit d'un prix TTC (TTC / 1,2), arrondi au centime ; `null` si la valeur est invalide. */
export function ttcToHT(ttc: number | string | null | undefined): number | null {
  if (ttc == null || ttc === '') return null;
  const value = Number(ttc);
  if (!Number.isFinite(value)) return null;
  return Math.round((value / FR_VAT_RATE) * 100) / 100;
}

const integer = new Intl.NumberFormat('fr-FR');

/** « 1 234 » ; « — » si la valeur est absente. */
export function formatInteger(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : integer.format(value);
}

const euroWhole = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/** « 1 235 € » : montant arrondi à l'euro, pour les gros chiffres (CA, marge). */
export function formatEuroWhole(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : euroWhole.format(value);
}

/** « 845 € », « 1,2 k€ », « 12 k€ », « 1,3 M€ » : montant compact pour les axes et les barres. */
export function formatCompactEuro(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const trim = (n: number) => n.toFixed(1).replace(/\.0$/, '').replace('.', ',');
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)} M€`;
  if (abs >= 10_000) return `${sign}${Math.round(abs / 1000)} k€`;
  if (abs >= 1000) return `${sign}${trim(abs / 1000)} k€`;
  return `${sign}${Math.round(abs)} €`;
}

const NARROW_NBSP = '\u202F';

/** « 3,2 % » ; `digits` décimales au plus. La valeur est déjà un pourcentage (3,2 et non 0,032). */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const text = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(value);
  return `${text}${NARROW_NBSP}%`;
}

/** Variation en % entre deux valeurs ; `null` si la référence est nulle (pas de base de comparaison). */
export function percentDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function oneDecimal(value: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);
}

/** Durée en millisecondes : « 12 min », « 3,5 h », « 2,1 j » ; « — » si absente. */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—';
  const minutes = ms / 60_000;
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 48) return `${oneDecimal(hours)} h`;
  return `${oneDecimal(hours / 24)} j`;
}

/** Durée en heures (délai d'expédition, de traitement) : « 14 h », « 5,5 h », « 2,3 j ». */
export function formatShipHours(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours)) return '—';
  if (hours < 1) return '< 1 h';
  if (hours < 48) return `${oneDecimal(hours)} h`;
  return `${oneDecimal(hours / 24)} j`;
}
