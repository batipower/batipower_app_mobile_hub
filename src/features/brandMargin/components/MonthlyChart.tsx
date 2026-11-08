import { useState } from 'react';
import { Pressable, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { formatCompactEuro } from '@/lib/format';
import { useTheme, withAlpha } from '@/theme';
import type { HubBrandMarginMonthly } from '@/types/hubBrandMargin';

import { formatMonthLabel } from '../lib/display';
import { marginOf, type MarginView } from '../lib/model';

const CHART_HEIGHT = 190;
const TOP = 16;
const BOTTOM = 20;
const PLOT_HEIGHT = CHART_HEIGHT - TOP - BOTTOM;

type MonthlyChartProps = {
  months: readonly HubBrandMarginMonthly[];
  view: MarginView;
  selectedMonth: string | null;
  onSelect: (month: string) => void;
};

/**
 * CA HT (barre claire) et marge de la vue (barre pleine, rouge si négative) mois par mois, en SVG.
 * Un appui sélectionne le mois sous le doigt ; VoiceOver passe d'un mois à l'autre par les gestes
 * « ajuster ».
 */
export function MonthlyChart({ months, view, selectedMonth, onSelect }: MonthlyChartProps) {
  const t = useTheme();
  const [width, setWidth] = useState(0);

  const slotWidth = months.length > 0 ? width / months.length : 0;
  const barWidth = Math.max(4, Math.min(22, slotWidth / 2 - 3));
  const margins = months.map((month) => marginOf(month, view).value);
  const maxValue = Math.max(1, ...months.map((month) => month.caHT), ...margins);
  const minValue = Math.min(0, ...margins);
  const range = maxValue - minValue || 1;
  const yFor = (value: number) => TOP + ((maxValue - value) / range) * PLOT_HEIGHT;
  const zeroY = yFor(0);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const handlePress = (event: GestureResponderEvent) => {
    if (slotWidth <= 0 || months.length === 0) return;
    const index = Math.min(
      months.length - 1,
      Math.max(0, Math.floor(event.nativeEvent.locationX / slotWidth)),
    );
    const month = months[index];
    if (month) onSelect(month.month);
  };

  const selectedIndex = months.findIndex((month) => month.month === selectedMonth);

  return (
    <Pressable
      onPress={handlePress}
      onLayout={onLayout}
      style={{ height: CHART_HEIGHT }}
      accessibilityRole="adjustable"
      accessibilityLabel="Graphique du chiffre d'affaires et de la marge par mois"
      accessibilityValue={{
        text: selectedMonth ? formatMonthLabel(selectedMonth, true) : 'Aucun mois sélectionné',
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        const action = event.nativeEvent.actionName;
        const target =
          action === 'increment'
            ? months[Math.min(months.length - 1, selectedIndex + 1)]
            : action === 'decrement'
              ? months[Math.max(0, selectedIndex - 1)]
              : undefined;
        if (target) onSelect(target.month);
      }}
    >
      {width > 0 ? (
        <View pointerEvents="none">
          <Svg width={width} height={CHART_HEIGHT}>
            <Line x1={0} x2={width} y1={zeroY} y2={zeroY} stroke={t.borderStrong} strokeWidth={1} />
            {months.map((month, index) => {
              const selected = month.month === selectedMonth;
              const center = index * slotWidth + slotWidth / 2;
              const margin = marginOf(month, view).value;
              const caY = yFor(month.caHT);
              const marginY = yFor(margin);
              return (
                <G key={month.month}>
                  {selected ? (
                    <Rect
                      x={index * slotWidth}
                      y={TOP}
                      width={slotWidth}
                      height={PLOT_HEIGHT}
                      fill={withAlpha(t.accent, 0.14)}
                    />
                  ) : null}
                  <Rect
                    x={center - barWidth - 1}
                    y={Math.min(caY, zeroY)}
                    width={barWidth}
                    height={Math.max(Math.abs(zeroY - caY), month.caHT !== 0 ? 1 : 0)}
                    rx={2}
                    fill={withAlpha(t.accent, selected ? 0.55 : 0.35)}
                  />
                  <Rect
                    x={center + 1}
                    y={Math.min(marginY, zeroY)}
                    width={barWidth}
                    height={Math.max(Math.abs(zeroY - marginY), margin !== 0 ? 1 : 0)}
                    rx={2}
                    fill={margin < 0 ? t.danger : t.accentText}
                    opacity={selected ? 1 : 0.85}
                  />
                  <SvgText
                    x={center}
                    y={CHART_HEIGHT - 5}
                    fontSize={10}
                    fontWeight={selected ? '700' : '400'}
                    fill={selected ? t.text : t.textFaint}
                    textAnchor="middle"
                  >
                    {formatMonthLabel(month.month)}
                  </SvgText>
                </G>
              );
            })}
            <SvgText x={0} y={10} fontSize={10} fontWeight="600" fill={t.textFaint}>
              {formatCompactEuro(maxValue)}
            </SvgText>
          </Svg>
        </View>
      ) : null}
    </Pressable>
  );
}
