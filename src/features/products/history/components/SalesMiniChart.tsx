import { useState } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';

import { fontSize, makeStyles, spacing, useTheme, withAlpha } from '@/theme';

import type { SalesBucket } from '../salesModel';

const BAR_AREA = 44;
const TOP = 12;
const LABEL_AREA = 14;
const HEIGHT = TOP + BAR_AREA + LABEL_AREA;

type SalesMiniChartProps = {
  /** Mois à tracer, du plus ancien au plus récent (le dernier est le mois en cours). */
  buckets: readonly SalesBucket[];
  loading?: boolean;
  /** Historique non chargé (erreur réseau) et aucun mois connu par ailleurs. */
  unavailable?: boolean;
  /** Appui sur le graphique : ouvre le détail (onglet Historique). */
  onPress?: () => void;
};

/**
 * Histogramme compact des ventes mensuelles (unités) pour l'en-tête de la fiche produit : une barre
 * par mois, mois en cours plus clair (incomplet), valeur affichée sur la barre la plus haute et sur
 * le mois en cours. Sans axe ni interaction de lecture : le détail est dans l'onglet Historique.
 */
export function SalesMiniChart({
  buckets,
  loading = false,
  unavailable = false,
  onPress,
}: SalesMiniChartProps) {
  const styles = useStyles();
  const t = useTheme();
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const slot = buckets.length > 0 ? width / buckets.length : 0;
  const barWidth = Math.max(6, Math.min(26, slot - 8));
  const maxValue = Math.max(1, ...buckets.map((bucket) => bucket.quantity));
  const peakIndex = buckets.reduce(
    (best, bucket, index) => (bucket.quantity > (buckets[best]?.quantity ?? 0) ? index : best),
    0,
  );
  const empty = buckets.every((bucket) => bucket.quantity === 0);

  const summary = buckets.map((bucket) => `${bucket.fullLabel} ${bucket.quantity}`).join(', ');

  if (loading) {
    return <View style={[styles.placeholder, { height: HEIGHT }]} accessibilityLabel="Chargement de l'historique" />;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      onLayout={onLayout}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={
        unavailable
          ? 'Historique des ventes indisponible'
          : empty
            ? 'Aucune vente sur les 8 derniers mois'
            : `Ventes en unités sur 8 mois : ${summary}`
      }
      accessibilityHint={onPress ? "Ouvre l'historique des ventes" : undefined}
      style={({ pressed }) => [{ height: HEIGHT }, pressed && { opacity: 0.6 }]}
    >
      {empty ? (
        <View style={[styles.empty, { height: HEIGHT }]}>
          <Text style={styles.emptyText}>
            {unavailable ? 'Historique indisponible' : 'Aucune vente sur 8 mois'}
          </Text>
        </View>
      ) : width > 0 ? (
        <View pointerEvents="none">
          <Svg width={width} height={HEIGHT}>
            {buckets.map((bucket, index) => {
              const center = index * slot + slot / 2;
              const barHeight =
                bucket.quantity > 0 ? Math.max(2, (bucket.quantity / maxValue) * BAR_AREA) : 1;
              const y = TOP + BAR_AREA - barHeight;
              const showValue = bucket.isCurrent || index === peakIndex;
              return (
                <G key={bucket.key}>
                  <Rect
                    x={center - barWidth / 2}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={2}
                    fill={bucket.isCurrent ? withAlpha(t.accent, 0.4) : t.accent}
                    opacity={bucket.quantity > 0 ? 1 : 0.35}
                  />
                  {showValue && bucket.quantity > 0 ? (
                    <SvgText
                      x={center}
                      y={y - 3}
                      fontSize={9}
                      fontWeight="700"
                      fill={t.text}
                      textAnchor="middle"
                    >
                      {bucket.quantity}
                    </SvgText>
                  ) : null}
                  <SvgText
                    x={center}
                    y={HEIGHT - 3}
                    fontSize={9}
                    fontWeight={bucket.isCurrent ? '700' : '400'}
                    fill={bucket.isCurrent ? t.text : t.textFaint}
                    textAnchor="middle"
                  >
                    {bucket.label}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </View>
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  placeholder: { borderRadius: 8, backgroundColor: t.surface },
  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  emptyText: { fontSize: fontSize.xs, color: t.textFaint },
}));
