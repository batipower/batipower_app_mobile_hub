import { useState } from 'react';
import { Pressable, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { formatInteger } from '@/lib/format';
import { useTheme, withAlpha } from '@/theme';

import type { SalesBucket } from '../salesModel';

const CHART_HEIGHT = 190;
const TOP = 16;
const BOTTOM = 20;
const PLOT_HEIGHT = CHART_HEIGHT - TOP - BOTTOM;
/** Largeur minimale d'un libellé d'axe : au-delà, on n'affiche qu'un libellé sur N. */
const MIN_LABEL_WIDTH = 34;

type SalesBarChartProps = {
  buckets: readonly SalesBucket[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  /** Prévision mensuelle enregistrée (ligne pleine) : histogramme mensuel uniquement. */
  forecast?: number | null;
  /** Prévision suggérée (ligne pointillée) : histogramme mensuel uniquement. */
  suggestion?: number | null;
  /** Texte VoiceOver décrivant le graphique. */
  accessibilityLabel: string;
};

/**
 * Histogramme des unités vendues par période (jour, semaine ou mois), en SVG. Un appui sélectionne
 * la barre sous le doigt ; VoiceOver passe d'une période à l'autre par les gestes « ajuster ». Les
 * mois M-1 à M-3 (base de la suggestion) sont en couleur pleine, le mois en cours est plus clair.
 */
export function SalesBarChart({
  buckets,
  selectedKey,
  onSelect,
  forecast,
  suggestion,
  accessibilityLabel,
}: SalesBarChartProps) {
  const t = useTheme();
  const [width, setWidth] = useState(0);

  const slot = buckets.length > 0 ? width / buckets.length : 0;
  const barWidth = Math.max(2, Math.min(26, slot - (slot > 14 ? 6 : 2)));
  const maxValue = Math.max(
    1,
    ...buckets.map((bucket) => bucket.quantity),
    forecast ?? 0,
    suggestion ?? 0,
  );
  const yFor = (value: number) => TOP + ((maxValue - value) / maxValue) * PLOT_HEIGHT;
  const baseY = yFor(0);
  const labelStep = slot > 0 ? Math.max(1, Math.ceil(MIN_LABEL_WIDTH / slot)) : 1;
  const selectedIndex = buckets.findIndex((bucket) => bucket.key === selectedKey);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const handlePress = (event: GestureResponderEvent) => {
    if (slot <= 0 || buckets.length === 0) return;
    const index = Math.min(
      buckets.length - 1,
      Math.max(0, Math.floor(event.nativeEvent.locationX / slot)),
    );
    const bucket = buckets[index];
    if (bucket) onSelect(bucket.key);
  };

  const fillFor = (bucket: SalesBucket) => {
    if (bucket.isCurrent) return withAlpha(t.accent, 0.4);
    return bucket.usedInSuggestion ? t.accent : withAlpha(t.accent, 0.55);
  };

  return (
    <Pressable
      onPress={handlePress}
      onLayout={onLayout}
      style={{ height: CHART_HEIGHT }}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        text:
          selectedIndex >= 0 && buckets[selectedIndex]
            ? `${buckets[selectedIndex].fullLabel} : ${buckets[selectedIndex].quantity} unités`
            : 'Aucune période sélectionnée',
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        const action = event.nativeEvent.actionName;
        const target =
          action === 'increment'
            ? buckets[Math.min(buckets.length - 1, selectedIndex + 1)]
            : action === 'decrement'
              ? buckets[Math.max(0, selectedIndex - 1)]
              : undefined;
        if (target) onSelect(target.key);
      }}
    >
      {width > 0 ? (
        <View pointerEvents="none">
          <Svg width={width} height={CHART_HEIGHT}>
            <Line x1={0} x2={width} y1={baseY} y2={baseY} stroke={t.borderStrong} strokeWidth={1} />
            {forecast != null && forecast > 0 ? (
              <Line
                x1={0}
                x2={width}
                y1={yFor(forecast)}
                y2={yFor(forecast)}
                stroke={t.text}
                strokeWidth={1.5}
              />
            ) : null}
            {suggestion != null && suggestion > 0 ? (
              <Line
                x1={0}
                x2={width}
                y1={yFor(suggestion)}
                y2={yFor(suggestion)}
                stroke={t.accentText}
                strokeWidth={1.5}
                strokeDasharray="5 3"
              />
            ) : null}
            {buckets.map((bucket, index) => {
              const selected = bucket.key === selectedKey;
              const center = index * slot + slot / 2;
              const barY = yFor(bucket.quantity);
              return (
                <G key={bucket.key}>
                  {selected ? (
                    <Rect
                      x={index * slot}
                      y={TOP}
                      width={slot}
                      height={PLOT_HEIGHT}
                      fill={withAlpha(t.accent, 0.14)}
                    />
                  ) : null}
                  <Rect
                    x={center - barWidth / 2}
                    y={barY}
                    width={barWidth}
                    height={Math.max(baseY - barY, bucket.quantity > 0 ? 1 : 0)}
                    rx={Math.min(3, barWidth / 2)}
                    fill={fillFor(bucket)}
                  />
                  {index % labelStep === 0 || selected ? (
                    <SvgText
                      x={center}
                      y={CHART_HEIGHT - 5}
                      fontSize={10}
                      fontWeight={selected ? '700' : '400'}
                      fill={selected ? t.text : t.textFaint}
                      textAnchor="middle"
                    >
                      {bucket.label}
                    </SvgText>
                  ) : null}
                </G>
              );
            })}
            <SvgText x={0} y={10} fontSize={10} fontWeight="600" fill={t.textFaint}>
              {formatInteger(maxValue)} u.
            </SvgText>
          </Svg>
        </View>
      ) : null}
    </Pressable>
  );
}
