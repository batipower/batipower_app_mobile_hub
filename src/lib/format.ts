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
