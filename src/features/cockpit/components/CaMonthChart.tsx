import { useState } from 'react';
import { Pressable, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { formatCompactEuro } from '@/lib/format';
import { makeStyles, useTheme, withAlpha } from '@/theme';
import type { HubDailyMargin } from '@/types/hubDashboard';

import { dayOfMonth, daysInMonth, formatDayLabel } from '../dates';

const CHART_HEIGHT = 170;
const TOP = 16;
const BOTTOM = 18;
const PLOT_HEIGHT = CHART_HEIGHT - TOP - BOTTOM;

type CaMonthChartProps = {
  /** Mois affiché, `YYYY-MM` : donne le nombre de colonnes (les jours à venir restent vides). */
  month: string;
  /** Jours écoulés du mois, triés par date. */
  days: readonly HubDailyMargin[];
  /** CA HT moyen par jour, tracé en pointillés. */
  average: number;
  selectedDate: string | null;
  onSelect: (date: string) => void;
  /** Données d'un autre mois en attendant celles du mois demandé. */
  dimmed?: boolean;
};

/**
 * Histogramme du CA HT jour par jour d'un mois, dessiné en SVG. Un appui sélectionne le
 * jour sous le doigt (le détail s'affiche à côté) ; VoiceOver passe d'un jour à l'autre par
 * les gestes « ajuster ».
 */
export function CaMonthChart({
  month,
  days,
  average,
  selectedDate,
  onSelect,
  dimmed,
}: CaMonthChartProps) {
  const styles = useStyles();
  const t = useTheme();
  const [width, setWidth] = useState(0);

  const slots = daysInMonth(month);
  const slotWidth = width / slots;
  const barWidth = Math.max(3, slotWidth - 2);
  const maxValue = Math.max(1, average, ...days.map((day) => day.caHT));
  const yFor = (value: number) => TOP + PLOT_HEIGHT - (Math.max(0, value) / maxValue) * PLOT_HEIGHT;
  const averageY = yFor(average);
  const baseline = TOP + PLOT_HEIGHT;

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const handlePress = (event: GestureResponderEvent) => {
    if (width <= 0 || days.length === 0) return;
    const slot = Math.floor(event.nativeEvent.locationX / slotWidth);
    // Jour le plus proche de la colonne touchée (les jours à venir n'ont pas de barre).
    let nearest = days[0];
    for (const day of days) {
      if (
        nearest &&
        Math.abs(dayOfMonth(day.date) - 1 - slot) < Math.abs(dayOfMonth(nearest.date) - 1 - slot)
      ) {
        nearest = day;
      }
    }
    if (nearest) onSelect(nearest.date);
  };

  const selectedIndex = days.findIndex((day) => day.date === selectedDate);

  return (
    <Pressable
      onPress={handlePress}
      onLayout={onLayout}
      style={[styles.wrap, dimmed && styles.dimmed]}
      accessibilityRole="adjustable"
      accessibilityLabel="Histogramme du chiffre d'affaires HT par jour"
      accessibilityValue={{
        text: selectedDate ? formatDayLabel(selectedDate) : 'Aucun jour sélectionné',
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        const action = event.nativeEvent.actionName;
        const target =
          action === 'increment'
            ? days[Math.min(days.length - 1, selectedIndex + 1)]
            : action === 'decrement'
              ? days[Math.max(0, selectedIndex - 1)]
              : undefined;
        if (target) onSelect(target.date);
      }}
    >
      {width > 0 ? (
        <View pointerEvents="none">
          <Svg width={width} height={CHART_HEIGHT}>
            <Line
              x1={0}
              x2={width}
              y1={baseline}
              y2={baseline}
              stroke={t.borderStrong}
              strokeWidth={1}
            />

            {days.map((day) => {
              const column = dayOfMonth(day.date) - 1;
              const selected = day.date === selectedDate;
              const x = column * slotWidth + (slotWidth - barWidth) / 2;
              const y = yFor(day.caHT);
              return (
                <G key={day.date}>
                  {selected ? (
                    <Rect
                      x={column * slotWidth}
                      y={TOP}
                      width={slotWidth}
                      height={PLOT_HEIGHT}
                      fill={withAlpha(t.accent, 0.14)}
                    />
                  ) : null}
                  <Rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(baseline - y, day.caHT > 0 ? 1 : 0)}
                    rx={Math.min(2, barWidth / 2)}
                    fill={selected ? t.accentText : t.accent}
                    opacity={selected ? 1 : day.caHT < average ? 0.5 : 0.9}
                  />
                </G>
              );
            })}

            {average > 0 ? (
              <Line
                x1={0}
                x2={width}
                y1={averageY}
                y2={averageY}
                stroke={t.warning}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            ) : null}

            <SvgText x={0} y={10} fontSize={10} fontWeight="600" fill={t.textFaint}>
              {formatCompactEuro(maxValue)}
            </SvgText>

            {Array.from({ length: slots }, (_, index) => index + 1)
              .filter((day) => day === 1 || day % 5 === 0)
              .map((day) => (
                <SvgText
                  key={day}
                  x={(day - 1) * slotWidth + slotWidth / 2}
                  y={CHART_HEIGHT - 4}
                  fontSize={9}
                  fill={t.textFaint}
                  textAnchor="middle"
                >
                  {String(day)}
                </SvgText>
              ))}
          </Svg>
        </View>
      ) : (
        <View style={{ height: CHART_HEIGHT }} />
      )}
    </Pressable>
  );
}

const useStyles = makeStyles(() => ({
  wrap: { height: CHART_HEIGHT },
  dimmed: { opacity: 0.4 },
}));
