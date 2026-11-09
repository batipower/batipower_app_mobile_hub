import { View } from 'react-native';

import { Badge } from '@/components/ui';
import { makeStyles, spacing } from '@/theme';
import type { HubBrandMarginProduct, HubBrandMarginProductTraits } from '@/types/hubBrandMargin';

const COUNTRY_ORDER = ['FR', 'BE', 'ES', 'IT', 'DE'];

/** Pays où le produit est encore monitoré (repricing Amazon et/ou ManoMano), dans l'ordre du web. */
export function monitoredCountries(traits: HubBrandMarginProductTraits): string[] {
  const all = new Set([...traits.amazonCountries, ...traits.manoManoCountries]);
  return COUNTRY_ORDER.filter((country) => all.has(country));
}

/**
 * Pastilles d'un produit : en ligne sur batipower.fr (ou hors ligne), pays monitorés, contraintes
 * d'expédition marketplace (volumineux, fragile). Rien n'est affiché si l'API ne renseigne rien.
 */
export function ProductTraitBadges({ product }: { product: HubBrandMarginProduct }) {
  const styles = useStyles();
  const { site, traits } = product;
  const countries = traits ? monitoredCountries(traits) : [];
  if (site === undefined && !traits) return null;
  return (
    <View style={styles.row}>
      {site === undefined ? null : site ? (
        <Badge label="En ligne" tone="green" />
      ) : (
        <Badge label="Hors ligne" tone="neutral" />
      )}
      {traits
        ? countries.length === 0
          ? [<Badge key="none" label="Non monitoré" tone="neutral" />]
          : countries.map((country) => <Badge key={country} label={country} tone="blue" />)
        : null}
      {traits?.tooVoluminous ? <Badge label="Volumineux" tone="amber" /> : null}
      {traits?.tooFragile ? <Badge label="Fragile" tone="red" /> : null}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
}));
