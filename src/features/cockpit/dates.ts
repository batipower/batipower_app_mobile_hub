/**
 * Dates du cockpit : le back raisonne en jours civils Europe/Paris (`YYYY-MM-DD`) et en mois
 * `YYYY-MM`. On manipule ces clés comme des chaînes, et on ne passe par `Date` (à midi,
 * heure locale) que pour les libellés, afin d'éviter tout décalage de fuseau.
 */

const PARIS_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Jour courant à Paris, `YYYY-MM-DD`. */
export function parisDateKey(date: Date = new Date()): string {
  const parts = Object.fromEntries(PARIS_PARTS.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Mois courant à Paris, `YYYY-MM`. */
export function parisMonthKey(date: Date = new Date()): string {
  return parisDateKey(date).slice(0, 7);
}

/** `YYYY-MM-DD` ou `YYYY-MM` → `Date` à midi, heure locale. */
function toLocalNoon(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12);
}

/** Mois précédent (`delta` = -1) ou suivant (`delta` = +1) d'une clé `YYYY-MM`. */
export function shiftMonth(monthKey: string, delta: number): string {
  const date = toLocalNoon(monthKey);
  date.setDate(1);
  date.setMonth(date.getMonth() + delta);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

/** Nombre de jours du mois `YYYY-MM`. */
export function daysInMonth(monthKey: string): number {
  const date = toLocalNoon(monthKey);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/** « novembre 2026 ». */
export function formatMonthLabel(monthKey: string): string {
  return toLocalNoon(monthKey).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

/** « ven. 6 nov. ». */
export function formatDayLabel(dateKey: string): string {
  return toLocalNoon(dateKey).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** « vendredi 6 novembre 2026 ». */
export function formatDayLong(dateKey: string): string {
  return toLocalNoon(dateKey).toLocaleDateString('fr-FR', { dateStyle: 'full' });
}

/** Heure d'un horodatage ISO à Paris : « 14:32 » ; « — » si invalide. */
export function formatParisTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  });
}

/** Numéro du jour dans le mois d'une clé `YYYY-MM-DD`. */
export function dayOfMonth(dateKey: string): number {
  return Number(dateKey.slice(8, 10));
}

/** Clé de jour valide (`YYYY-MM-DD`), pour un paramètre de route. */
export function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
