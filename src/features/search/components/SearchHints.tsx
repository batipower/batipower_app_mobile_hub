import { StyleSheet, Text, View } from 'react-native';
import { Search } from 'lucide-react-native';

import { EmptyState } from '@/features/preparation/components/ListState';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';

type SearchHintsProps = {
  /** Le compte peut aussi chercher des fiches produit (SUPERADMIN, MANAGER). */
  withProducts: boolean;
};

const ORDER_EXAMPLES = ['BATPWR…', 'Nom du client', '06 12 34 56 78', 'N° de suivi', 'Email'];
const PRODUCT_EXAMPLES = ['Référence produit', 'EAN', 'Désignation', 'SKU'];

/** Aide à la saisie, affichée quand le champ est vide : ce qu'on peut chercher. */
export function SearchHints({ withProducts }: SearchHintsProps) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      <EmptyState
        icon={<Search size={24} color={t.textMuted} />}
        title="Rechercher dans le HUB"
        text={
          withProducts
            ? 'Retrouvez une commande ou une fiche produit en quelques lettres.'
            : 'Retrouvez une commande en quelques lettres.'
        }
      />
      <ExampleGroup title="Commandes" examples={ORDER_EXAMPLES} />
      {withProducts ? <ExampleGroup title="Produits" examples={PRODUCT_EXAMPLES} /> : null}
    </View>
  );
}

function ExampleGroup({ title, examples }: { title: string; examples: string[] }) {
  const styles = useStyles();
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.chips}>
        {examples.map((example) => (
          <View key={example} style={styles.chip}>
            <Text style={styles.chipText}>{example}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { gap: spacing.lg, paddingBottom: spacing['3xl'] },
  group: { alignItems: 'center', gap: spacing.sm },
  groupTitle: { fontSize: fontSize.xs, fontWeight: '700', color: t.textSubtle },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.borderStrong,
    backgroundColor: t.card,
  },
  chipText: { fontSize: fontSize.xs, color: t.textMuted },
}));
