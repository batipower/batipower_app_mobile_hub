import { Text, View } from 'react-native';

import { formatEuroWhole, formatInteger } from '@/lib/format';
import { fontSize, makeStyles, spacing } from '@/theme';
import type { HubBrandMarginCoverage } from '@/types/hubBrandMargin';

/** Règles de calcul de la marge et réserves de couverture, en pied d'écran (comme le web). */
export function BrandMarginFootnote({ coverage }: { coverage: HubBrandMarginCoverage }) {
  const styles = useStyles();
  const neutralized = coverage.neutralizedCancellations;
  return (
    <View style={styles.root}>
      <Text style={styles.text}>
        {
          "Marge sans SAV = CA HT − achats − transport − commissions marketplace, commandes remboursées mais expédiées comptées comme vendues. Impact SAV = pertes (casse, panne technique, litige transporteur, perte totale) − valeur d'achat des produits remis en stock + coût des renvois ; les retours client revendables n'en font pas partie ; les commandes avec une annulation validée sont neutralisées (ni CA, ni coûts, ni SAV). Étiquettes retour non chiffrées. Taux actuel = les mêmes ventes revalorisées aux prix de vente et d'achat actuels en base."
        }
      </Text>
      {coverage.incompleteOrders > 0 ? (
        <Text style={styles.text}>
          {`${formatInteger(coverage.incompleteOrders)} commande(s) au calcul incomplet (prix d'achat, poids ou grille de transport manquant) : marge estimée.`}
        </Text>
      ) : null}
      {coverage.unattributedSlipsHT > 0 ? (
        <Text style={styles.text}>
          {`${formatEuroWhole(coverage.unattributedSlipsHT)} d'avoirs non répartis sur les lignes de leur commande.`}
        </Text>
      ) : null}
      {(coverage.excessSlipsHT ?? 0) > 0 ? (
        <Text style={styles.text}>
          {`${formatEuroWhole(coverage.excessSlipsHT)} d'avoirs en doublon ignorés (cumul supérieur au montant payé de la commande).`}
        </Text>
      ) : null}
      {neutralized && neutralized.orders > 0 ? (
        <Text style={styles.text}>
          {`${formatInteger(neutralized.orders)} commande(s) annulée(s) neutralisée(s) (${formatEuroWhole(neutralized.caHT)} de CA exclus du calcul).`}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: spacing.xs },
  text: { fontSize: fontSize.xs, lineHeight: 16, color: t.textMuted },
}));
