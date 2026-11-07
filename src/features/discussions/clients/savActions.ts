import { Banknote, FileCheck2, PackageOpen, Tag, type LucideIcon } from 'lucide-react-native';

import { formatEuro } from '@/lib/format';
import type { ProposedAction, SupportActionType } from '@/types/supportChat';

/** Icône de chaque type d'action SAV. */
export const ACTION_ICONS: Record<SupportActionType, LucideIcon> = {
  REFUND: Banknote,
  RETURN_LABEL: Tag,
  NON_RECEIPT_ATTESTATION: FileCheck2,
  RESEND: PackageOpen,
};

/** Libellé court d'un type d'action (historique, sélecteur). */
export const ACTION_TYPE_LABELS: Record<SupportActionType, string> = {
  REFUND: 'Avoir',
  RETURN_LABEL: 'Étiquette de retour',
  NON_RECEIPT_ATTESTATION: 'Attestation de non-réception',
  RESEND: 'Renvoi',
};

export function isSupportActionType(value: string): value is SupportActionType {
  return value in ACTION_TYPE_LABELS;
}

/** Libellé lisible d'une action de l'historique, même pour un type inconnu du mobile. */
export function actionTypeLabel(type: string): string {
  return isSupportActionType(type) ? ACTION_TYPE_LABELS[type] : type;
}

/** Clé d'identification d'une action proposée (une action par type et par commande). */
export const actionKey = (action: Pick<ProposedAction, 'type' | 'orderReference'>) =>
  `${action.type}:${action.orderReference}`;

/** Résumé des paramètres d'une action proposée (« Avoir total (hors port) », « 2 colis »…). */
export function describeActionParams(action: ProposedAction): string | null {
  const { params } = action;
  if (action.type === 'REFUND') {
    if (params.mode === 'total') return 'Avoir total (hors port)';
    if (params.mode === 'custom' && params.amount != null) {
      return `Avoir de ${formatEuro(params.amount)} TTC`;
    }
    if (params.mode === 'products' && params.products?.length) {
      return `Avoir sur ${params.products.map((p) => `${p.quantity} × ${p.reference}`).join(', ')}`;
    }
  }
  if (action.type === 'RETURN_LABEL') {
    const count = params.nbColis ?? 1;
    return `${count} colis`;
  }
  return null;
}

/** Texte du renvoi : l'action n'est jamais exécutée depuis le HUB mobile. */
export const RESEND_MANUAL_NOTICE =
  'Le renvoi d’une commande se traite à la main depuis la fiche de la commande : il ne peut pas être exécuté ici.';
