import type {
  SupportHoursConfig,
  SupportUpcomingHoliday,
  SupportTimeRange,
  SupportWeeklySchedule,
} from '@/types/adminPlatform';

/** Lundi → dimanche ; la clé est le `getDay()` JavaScript (0 = dimanche). */
export const SUPPORT_DAYS: readonly { key: string; label: string }[] = [
  { key: '1', label: 'Lundi' },
  { key: '2', label: 'Mardi' },
  { key: '3', label: 'Mercredi' },
  { key: '4', label: 'Jeudi' },
  { key: '5', label: 'Vendredi' },
  { key: '6', label: 'Samedi' },
  { key: '0', label: 'Dimanche' },
];

export const DEFAULT_RANGE: SupportTimeRange = { start: '09:00', end: '18:00' };
export const MAX_RANGES_PER_DAY = 4;
export const MESSAGE_MAX_LENGTH = 280;

export function toMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Même contrôle que le back, pour prévenir avant l'envoi. Renvoie le message d'erreur ou `null`. */
export function validateSchedule(weekly: SupportWeeklySchedule): string | null {
  for (const { key, label } of SUPPORT_DAYS) {
    const ranges = [...(weekly[key] ?? [])].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    for (const range of ranges) {
      if (!range.start || !range.end) return `${label} : renseignez l'heure de début et de fin.`;
      if (toMinutes(range.start) >= toMinutes(range.end)) {
        return `${label} : l'heure de début doit précéder l'heure de fin.`;
      }
    }
    for (let i = 1; i < ranges.length; i += 1) {
      if (toMinutes(ranges[i]!.start) < toMinutes(ranges[i - 1]!.end)) {
        return `${label} : les plages horaires ne doivent pas se chevaucher.`;
      }
    }
  }
  return null;
}

export function cloneSchedule(weekly: SupportWeeklySchedule): SupportWeeklySchedule {
  const out: SupportWeeklySchedule = {};
  for (const { key } of SUPPORT_DAYS) out[key] = (weekly[key] ?? []).map((r) => ({ ...r }));
  return out;
}

export function summarizeDay(ranges: SupportTimeRange[]): string {
  if (ranges.length === 0) return 'Fermé';
  return ranges.map((r) => `${r.start} - ${r.end}`).join(' · ');
}

/** Jour civil `YYYY-MM-DD` d'un instant dans le fuseau du support. */
function dateKeyIn(timezone: string, now: Date): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/** « mercredi 11 novembre » à partir de `YYYY-MM-DD` (sans décalage de fuseau). */
export function formatHolidayDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)));
}

/** Même ensemble de fériés rouverts, comparé sans tenir compte de l'ordre. */
export function sameHolidays(a: readonly string[], b: readonly string[]): boolean {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

export function holidayDescription(
  holiday: SupportUpcomingHoliday,
  open: boolean,
  weekly: SupportWeeklySchedule,
): string {
  const day = SUPPORT_DAYS.find((d) => d.key === String(holiday.weekday));
  const label = day ? day.label.toLowerCase() : '';
  const date = formatHolidayDate(holiday.date);
  if (!open) return `${date} · Fermé`;
  const ranges = weekly[String(holiday.weekday)] ?? [];
  return ranges.length > 0
    ? `${date} · Ouvert ${summarizeDay(ranges)}`
    : `${date} · Aucun horaire le ${label} dans le planning : restera fermé`;
}

/** Résumé d'aujourd'hui pour la carte d'accueil (un férié fermé n'affiche pas les horaires du planning). */
export function todaySummary(config: SupportHoursConfig, now = new Date()): string {
  if (config.forceClosed) return 'Fermeture exceptionnelle en cours';
  const todayKey = dateKeyIn(config.timezone, now);
  const holiday = (config.upcomingHolidays ?? []).find((h) => h.date === todayKey);
  if (holiday && !(config.openHolidays ?? []).includes(todayKey)) {
    return `Aujourd'hui : Fermé (${holiday.name})`;
  }
  const ranges = config.weekly[String(now.getDay())] ?? [];
  return `Aujourd'hui : ${summarizeDay(ranges)}`;
}
