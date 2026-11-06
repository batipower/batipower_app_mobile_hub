import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { errorMessage } from '@/features/preparation/components/ListState';
import { formatEuroWhole, formatInteger, formatPercent } from '@/lib/format';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { formatDayLabel, formatMonthLabel, parisMonthKey, shiftMonth } from '../dates';
import { useCaMonth } from '../hooks/useCockpitData';
import { openDayOrders } from '../navigation';
import { CaMonthChart } from './CaMonthChart';
import { DeltaChip, Panel } from './CockpitPrimitives';
import { MonthSummaryRow } from './MonthSummaryRow';

type CaMonthSectionProps = {
  showMargin: boolean;
};

/**
 * CA du mois : histogramme parcourable mois par mois, détail du jour sélectionné (avec accès
 * à ses commandes) et cumul du mois.
 */
export function CaMonthSection({ showMargin }: CaMonthSectionProps) {
  const styles = useStyles();
  const t = useTheme();
  const currentMonth = parisMonthKey();
  const [month, setMonth] = useState(currentMonth);
  const [selected, setSelected] = useState<string | null>(null);
  const { view, loading, switching, error, refetch } = useCaMonth(month);

  const canGoNext = month < currentMonth;
  const changeMonth = (delta: number) => {
    void Haptics.selectionAsync().catch(() => undefined);
    setMonth((value) => shiftMonth(value, delta));
    setSelected(null);
  };

  // Sans sélection (ou si le jour n'existe plus dans ce mois), le dernier jour fait foi.
  const days = view?.days;
  const day = useMemo(() => {
    if (!days || days.length === 0) return null;
    return days.find((item) => item.date === selected) ?? days[days.length - 1] ?? null;
  }, [days, selected]);

  const nav = (
    <View style={styles.nav}>
      <Pressable
        onPress={() => changeMonth(-1)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Mois précédent"
        style={styles.navButton}
      >
        <ChevronLeft size={18} color={t.accentText} />
      </Pressable>
      <Text style={styles.monthLabel} numberOfLines={1}>
        {formatMonthLabel(month)}
      </Text>
      <Pressable
        onPress={() => changeMonth(1)}
        disabled={!canGoNext}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Mois suivant"
        accessibilityState={{ disabled: !canGoNext }}
        style={[styles.navButton, !canGoNext && styles.navDisabled]}
      >
        <ChevronRight size={18} color={t.accentText} />
      </Pressable>
    </View>
  );

  return (
    <Panel title="CA HT du mois" trailing={nav}>
      {loading ? (
        <View
          style={styles.skeleton}
          accessibilityLabel="Chargement"
          accessibilityRole="progressbar"
        />
      ) : !view ? (
        <View style={styles.errorBox} accessibilityRole="alert">
          <Text style={styles.errorText}>
            {errorMessage(error, "Impossible de charger l'histogramme.")}
          </Text>
          <Pressable onPress={() => void refetch()} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.retry}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <CaMonthChart
            month={view.month}
            days={view.days}
            average={view.average.caHT}
            selectedDate={day?.date ?? null}
            onSelect={setSelected}
            dimmed={switching}
          />
          <Text style={styles.averageHint}>
            Pointillés : moyenne de {formatEuroWhole(view.average.caHT)} par jour
            {view.average.scope === 'previous-month' ? ' (mois précédent)' : ''}
          </Text>

          {day ? (
            <Pressable
              onPress={() => openDayOrders(day.date, { margin: showMargin })}
              accessibilityRole="button"
              accessibilityLabel={`Commandes du ${formatDayLabel(day.date)}`}
              style={({ pressed }) => [styles.day, pressed && styles.dayPressed]}
            >
              <View style={styles.dayText}>
                <Text style={styles.dayLabel}>{formatDayLabel(day.date)}</Text>
                <View style={styles.dayFigures}>
                  <Text style={styles.dayCa}>{formatEuroWhole(day.caHT)}</Text>
                  <DeltaChip
                    current={day.caHT}
                    previous={view.average.caHT}
                    context="par rapport à la moyenne"
                  />
                </View>
                <Text style={styles.dayHint}>
                  {formatInteger(day.ordersCount)} commande{day.ordersCount > 1 ? 's' : ''}
                  {showMargin
                    ? ` · marge ${formatEuroWhole(day.marginHT)}${
                        day.caHT > 0 ? ` (${formatPercent((day.marginHT / day.caHT) * 100)})` : ''
                      }`
                    : ''}
                </Text>
              </View>
              <View style={styles.dayAction}>
                <Text style={styles.dayActionText}>Commandes</Text>
                <ChevronRight size={16} color={t.accentText} />
              </View>
            </Pressable>
          ) : (
            <Text style={styles.averageHint}>Aucune commande réalisée sur ce mois.</Text>
          )}

          <MonthSummaryRow summary={view.summary} showMargin={showMargin} />
        </>
      )}
    </Panel>
  );
}

const useStyles = makeStyles((t) => ({
  nav: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  navButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  navDisabled: { opacity: 0.25 },
  monthLabel: {
    minWidth: 110,
    textAlign: 'center',
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'capitalize',
    color: t.text,
  },
  skeleton: { height: 260, borderRadius: radius.md, backgroundColor: t.surface },
  errorBox: { gap: spacing.sm, alignItems: 'flex-start' },
  errorText: { fontSize: fontSize.sm, color: t.danger },
  retry: { fontSize: fontSize.sm, fontWeight: '700', color: t.accentText },
  averageHint: { fontSize: 11, color: t.textSubtle },
  day: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(t.accent, 0.3),
    backgroundColor: withAlpha(t.accent, 0.07),
  },
  dayPressed: { backgroundColor: withAlpha(t.accent, 0.14) },
  dayText: { flex: 1, gap: 3 },
  dayLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'capitalize',
    color: t.textMuted,
  },
  dayFigures: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dayCa: { fontSize: fontSize.xl, fontWeight: '800', color: t.text },
  dayHint: { fontSize: 11, color: t.textSubtle },
  dayAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  dayActionText: { fontSize: fontSize.xs, fontWeight: '700', color: t.accentText },
}));
