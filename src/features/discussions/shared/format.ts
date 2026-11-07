import type { GroupDiscussionScope } from '@/types/discussions';

/**
 * Libellés et formats des discussions, repris de `front_externe_batipower/components/discussions/utils.ts`
 * (avec les accents que le web a omis).
 */

/**
 * Format compact pour une liste de conversations :
 * aujourd'hui « 14:32 », hier « Hier », cette semaine « lun. », plus ancien « 05/03 ».
 */
export function formatLastMessageAt(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - day.getTime()) / (24 * 3600 * 1000));

  if (diffDays <= 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

/** Date détaillée d'un message : « 13 mai 26 · 14:32 ». */
export function formatFullDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

export function categoryTypeLabel(value: string | null | undefined): string {
  if (!value) return '';
  const map: Record<string, string> = {
    ELECTRICITE: 'Électricité',
    VENTILATION: 'Ventilation',
    PLOMBERIE: 'Plomberie',
    CHAUFFAGE: 'Chauffage',
    SANITAIRE: 'Sanitaire',
    OUTILLAGE: 'Outillage',
    CARRELAGE: 'Carrelage',
    PHOTO: 'Photo',
  };
  return map[value] ?? value;
}

/** « Service Plomberie », « Marque VAILLANT », « Sélection produits », « Discussion libre », « Message direct ». */
export function scopeLabel(
  scope: GroupDiscussionScope,
  categoryType: string | null,
  brand?: string | null,
): string {
  switch (scope) {
    case 'CATEGORY':
      return `Service ${categoryTypeLabel(categoryType)}`.trim();
    case 'BRAND':
      return brand ? `Marque ${brand}` : 'Marque';
    case 'FREE':
      return 'Discussion libre';
    case 'DIRECT':
      return 'Message direct';
    default:
      return 'Sélection produits';
  }
}

/** Initiales d'un nom, pour les avatars textuels. */
export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Couleur HSL stable dérivée d'une chaîne (avatars). */
export function colorFromString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) | 0;
  return `hsl(${Math.abs(hash) % 360}, 55%, 45%)`;
}

/** Texte du compteur d'une pastille : « 7 », « 99+ ». */
export function badgeCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}
