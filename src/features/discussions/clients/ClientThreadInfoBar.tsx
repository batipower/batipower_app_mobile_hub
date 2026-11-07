import { Pressable, Text, View } from 'react-native';
import { ChevronRight, ShoppingCart, Package } from 'lucide-react-native';

import { Badge } from '@/components/ui';
import { fontSize, hitTarget, makeStyles, monoFontFamily, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { SupportConversation } from '@/types/supportChat';

import { subjectLabelOf, subjectMetaOf } from './subject';

type ClientThreadInfoBarProps = {
  conversation: SupportConversation;
  /** Le rôle donne accès aux fiches produit du HUB. */
  canOpenProduct: boolean;
  onOpenOrder: (reference: string) => void;
  onOpenProduct: (reference: string) => void;
};

/**
 * Bandeau sous l'en-tête : statut (Ouverte / Fermée), sujet de la conversation, lien vers la
 * commande ou la fiche produit liée, adresse e-mail du client et rappel d'un fil fermé.
 */
export function ClientThreadInfoBar({
  conversation,
  canOpenProduct,
  onOpenOrder,
  onOpenProduct,
}: ClientThreadInfoBarProps) {
  const styles = useStyles();
  const t = useTheme();
  const closed = conversation.status === 'CLOSED';
  const meta = subjectMetaOf(conversation);
  const reference = conversation.subjectReference;

  const isOrder = conversation.subjectType === 'ORDER';
  const isProduct = conversation.subjectType === 'PRODUCT';
  const link =
    reference && isOrder
      ? { label: `Commande ${reference}`, Icon: ShoppingCart, onPress: () => onOpenOrder(reference) }
      : reference && isProduct && canOpenProduct
        ? { label: `Produit ${reference}`, Icon: Package, onPress: () => onOpenProduct(reference) }
        : null;

  return (
    <View style={styles.root}>
      <View style={styles.badges}>
        <Badge label={closed ? 'Fermée' : 'Ouverte'} tone={closed ? 'neutral' : 'green'} />
        <Badge label={subjectLabelOf(conversation)} tone={meta.tone} />
        {conversation.customerEmail ? (
          <Text style={styles.email} numberOfLines={1} selectable>
            {conversation.customerEmail}
          </Text>
        ) : null}
      </View>

      {link ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ouvrir : ${link.label}`}
          onPress={link.onPress}
          style={({ pressed }) => [styles.link, pressed && { backgroundColor: t.cardPressed }]}
        >
          <link.Icon size={16} color={t.accentText} />
          <Text style={styles.linkText} numberOfLines={1}>
            {link.label}
          </Text>
          <ChevronRight size={16} color={t.textSubtle} />
        </Pressable>
      ) : (isOrder || isProduct) && !reference ? (
        <Text style={styles.unlinked}>
          {isOrder ? 'Commande non reliée au HUB.' : 'Produit non relié au HUB.'}
        </Text>
      ) : null}

      {closed ? (
        <View style={styles.closed} accessibilityRole="alert">
          <Text style={styles.closedText}>
            Cette conversation est fermée. Envoyer un message la rouvrira automatiquement.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
    backgroundColor: t.bgElevated,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  email: { flexShrink: 1, fontSize: fontSize.xs, color: t.textMuted },
  link: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  linkText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: t.accentText,
    fontFamily: monoFontFamily,
  },
  unlinked: { fontSize: fontSize.xs, color: t.textSubtle },
  closed: {
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(t.warning, 0.35),
    backgroundColor: withAlpha(t.warning, 0.1),
  },
  closedText: { fontSize: fontSize.xs, lineHeight: 17, color: t.warning },
}));
