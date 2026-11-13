import { Text, View } from 'react-native';

import { Button, DetailSection, InfoRow } from '@/components/ui';
import { ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { openWebsitePriceEdit } from '@/features/search/navigation';
import { formatEuro, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';

import { useWebsitePricing } from '../hooks/useWebsitePricing';
import { hasActivePromo } from '../websitePricing';

type ProductWebsitePricingProps = {
  reference: string;
};

/**
 * Prix de vente du produit sur le site : prix TTC actuel, marge sur le prix d'achat fixe et
 * accès à la modification du prix. Réservée au SUPERADMIN (le back masque la marge au MANAGER) :
 * l'écran parent ne l'affiche que pour ce rôle.
 */
export function ProductWebsitePricing({ reference }: ProductWebsitePricingProps) {
  const styles = useStyles();
  const t = useTheme();
  const { data: pricing, isPending, error, refetch } = useWebsitePricing(reference, true);

  if (isPending && !error) {
    return <ListSkeleton rows={1} height={150} />;
  }

  if (!pricing) {
    return (
      <DetailSection title="Site web">
        <ErrorBanner
          error={error}
          fallback="Impossible de charger le prix du site"
          onRetry={() => void refetch()}
        />
      </DetailSection>
    );
  }

  const promo = hasActivePromo(pricing);
  const margin = pricing.margin;
  const marginTone =
    margin?.marginHT == null ? undefined : margin.marginHT >= 0 ? t.success : t.danger;

  return (
    <DetailSection title="Site web">
      <InfoRow
        label="Prix de vente TTC"
        value={formatEuro(promo ? pricing.basePriceTTC : pricing.effectiveTTC)}
      />
      <InfoRow
        label="Prix de vente HT"
        value={formatEuro(promo ? pricing.basePriceHT : pricing.effectiveHT)}
      />
      {promo ? (
        <InfoRow label="Prix promo TTC" value={formatEuro(pricing.effectiveTTC)} />
      ) : null}
      <InfoRow label="Prix d'achat fixe HT" value={formatEuro(margin?.costHT)} />
      <View style={styles.marginRow}>
        <Text style={styles.marginLabel}>Marge{promo ? ' (promo comprise)' : ''}</Text>
        <Text style={[styles.marginValue, marginTone ? { color: marginTone } : null]}>
          {margin?.marginHT == null
            ? 'Prix d\u2019achat manquant'
            : `${formatEuro(margin.marginHT)} HT (${formatPercent(margin.marginPct)})`}
        </Text>
      </View>
      {promo ? (
        <Text style={styles.hint}>
          Une promotion est en cours : le prix catalogue modifié ici reste son point de départ.
        </Text>
      ) : null}
      <Button
        label="Modifier le prix"
        variant="outline"
        onPress={() => openWebsitePriceEdit(reference)}
      />
    </DetailSection>
  );
}

const useStyles = makeStyles((t) => ({
  marginRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  marginLabel: { fontSize: fontSize.sm, color: t.textMuted },
  marginValue: {
    flexShrink: 1,
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: t.text,
    textAlign: 'right',
  },
  hint: { fontSize: fontSize.xs, lineHeight: 17, color: t.textSubtle },
}));
