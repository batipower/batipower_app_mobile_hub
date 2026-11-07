import { FileText, MessageSquare, Package, ShoppingCart, type LucideIcon } from 'lucide-react-native';

import type { BadgeTone } from '@/components/ui';
import type { SupportConversation, SupportConversationSubjectType } from '@/types/supportChat';

export const SUBJECT_META: Record<
  SupportConversationSubjectType,
  { label: string; tone: BadgeTone; icon: LucideIcon }
> = {
  GENERAL: { label: 'Libre', tone: 'neutral', icon: MessageSquare },
  ORDER: { label: 'Commande', tone: 'blue', icon: ShoppingCart },
  QUOTE: { label: 'Devis', tone: 'purple', icon: FileText },
  PRODUCT: { label: 'Produit', tone: 'amber', icon: Package },
};

export function subjectMetaOf(conversation: SupportConversation) {
  return SUBJECT_META[conversation.subjectType] ?? SUBJECT_META.GENERAL;
}

/** Libellé du sujet : celui de la conversation (« Commande 12345 »), sinon le type seul. */
export function subjectLabelOf(conversation: SupportConversation): string {
  const meta = subjectMetaOf(conversation);
  if (conversation.subjectType === 'GENERAL' || !SUBJECT_META[conversation.subjectType]) {
    return meta.label;
  }
  return conversation.subjectLabel || meta.label;
}
