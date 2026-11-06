import { View } from 'react-native';

import { Badge } from '@/components/ui';
import { makeStyles, spacing } from '@/theme';

import { splitOrderTags } from '../orderHelpers';

type OrderTagBadgesProps = {
  tags: string[];
  /** Nombre maximal de tags « libres » affichés (les autres sont résumés en « +N »). */
  maxCustom?: number;
};

/** Badges d'une commande : stock QG, attente livreur, inter-agence, urgences et tags libres. */
export function OrderTagBadges({ tags, maxCustom = 2 }: OrderTagBadgesProps) {
  const styles = useStyles();
  const { urgent, custom, hasInterAgency, awaitingDriver, stockQg } = splitOrderTags(tags);
  const visibleCustom = custom.slice(0, maxCustom);
  const hidden = custom.length - visibleCustom.length;

  if (!stockQg && !awaitingDriver && !hasInterAgency && urgent.length + custom.length === 0) {
    return null;
  }

  return (
    <View style={styles.row}>
      {urgent.map((tag) => (
        <Badge key={tag} label={tag} tone="red" />
      ))}
      {stockQg ? <Badge label="Stock QG" tone="green" /> : null}
      {awaitingDriver ? <Badge label="Attente livreur" tone="amber" /> : null}
      {hasInterAgency ? <Badge label="Inter-agence" tone="blue" /> : null}
      {visibleCustom.map((tag) => (
        <Badge key={tag} label={tag} tone="neutral" />
      ))}
      {hidden > 0 ? <Badge label={`+${hidden}`} tone="neutral" /> : null}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
}));
