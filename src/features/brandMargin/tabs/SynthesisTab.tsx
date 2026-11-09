import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { formatEuroWhole, formatInteger } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { HubBrandMarginDetail, HubBrandMarginFigures } from '@/types/hubBrandMargin';

import { MonthlyChart } from '../components/MonthlyChart';
import { AlertBadges, CostBars, Section } from '../components/primitives';
import { brandAlerts, costRatios, marginSteps } from '../lib/diagnostic';
import {
  formatMonthLabel,
  formatPoints,
  formatRate,
  formatSignedEuro,
  marginColor,
} from '../lib/display';
import { marginOf, originLabel, type MarginView } from '../lib/model';

type SynthesisTabProps = {
  detail: HubBrandMarginDetail;
  /** Moyenne de toutes les marques (même marketplace) : absente tant que la vue d'ensemble charge. */
  average: HubBrandMarginFigures | null;
  view: MarginView;
  /** Restreint toute la fiche à une marketplace ; `null` retire le filtre. */
  onSelectOrigin: (origin: string | null) => void;
};

/** Synthèse d'une marque : chiffres clés, diagnostic, cascade de la marge, coûts, mois et marketplaces. */
export function SynthesisTab({ detail, average, view, onSelectOrigin }: SynthesisTabProps) {
  const styles = useStyles();
  const t = useTheme();
  const { totals } = detail;
  const alerts = average ? brandAlerts(totals, average, view) : [];
  const steps = marginSteps(totals, view);
  const [picked, setPicked] = useState<string | null>(null);
  const selectedMonth =
    detail.monthly.find((month) => month.month === picked) ?? detail.monthly.at(-1) ?? null;
  const selectedMargin = selectedMonth ? marginOf(selectedMonth, view) : null;
  const averageByStep = useMemo(
    () => new Map((average ? marginSteps(average, view) : []).map((step) => [step.id, step.amount])),
    [average, view],
  );
  const averageCa = average?.caHT ?? 0;

  return (
    <View style={styles.root}>
      {alerts.length > 0 ? (
        <Section title="Diagnostic">
          <View style={styles.diagnostic}>
            <AlertBadges alerts={alerts} />
            {alerts.map((alert) => (
              <Text key={alert.id} style={styles.detail}>
                {`${alert.label} : ${alert.detail}`}
              </Text>
            ))}
          </View>
        </Section>
      ) : null}

      <Section title="Du CA à la marge">
        <View style={styles.steps}>
          {steps.map((step) => {
            const own = totals.caHT > 0 ? (step.amount / totals.caHT) * 100 : null;
            const reference = averageByStep.get(step.id);
            const ref = reference != null && averageCa > 0 ? (reference / averageCa) * 100 : null;
            const diff = own != null && ref != null ? own - ref : null;
            // Écart « en points défavorables » : pour un coût, positif = plus de coût que la moyenne.
            const gap = diff == null ? null : step.kind === 'cost' ? -diff : diff;
            const bad = gap != null && step.kind !== 'revenue' && (step.kind === 'cost' ? gap >= 1 : gap <= -1);
            const good = gap != null && step.kind !== 'revenue' && (step.kind === 'cost' ? gap <= -1 : gap >= 1);
            const display = (value: number) => (step.kind === 'cost' ? Math.abs(value) : value);
            return (
              <View key={step.id} style={styles.stepBlock}>
                <View style={styles.step}>
                  <Text style={[styles.stepLabel, step.kind !== 'cost' && styles.strong]}>
                    {step.label}
                  </Text>
                  <Text
                    style={[
                      styles.stepValue,
                      step.kind !== 'cost' && styles.strong,
                      step.kind === 'result' ? { color: marginColor(t, step.amount) } : null,
                    ]}
                  >
                    {step.kind === 'cost'
                      ? formatSignedEuro(step.amount)
                      : formatEuroWhole(step.amount)}
                  </Text>
                </View>
                {step.kind !== 'revenue' ? (
                  <Text style={styles.detail}>
                    {`${own != null ? formatRate(display(own)) : 'n/a'} du CA · moy. ${ref != null ? formatRate(display(ref)) : '—'}`}
                    {gap != null ? (
                      <Text
                        style={{
                          fontWeight: '700',
                          color: bad ? t.danger : good ? t.accentText : t.textMuted,
                        }}
                      >{` · ${formatPoints(gap)}`}</Text>
                    ) : null}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </Section>

      {average ? (
        <Section title="Coûts en % du CA (vs moyenne)">
          <CostBars own={costRatios(totals)} average={costRatios(average)} />
        </Section>
      ) : null}

      {detail.monthly.length > 0 ? (
        <Section title="Évolution mensuelle">
          <MonthlyChart
            months={detail.monthly}
            view={view}
            selectedMonth={selectedMonth?.month ?? null}
            onSelect={setPicked}
          />
          {selectedMonth && selectedMargin ? (
            <Text style={styles.detail}>
              {`${formatMonthLabel(selectedMonth.month, true)} : CA ${formatEuroWhole(selectedMonth.caHT)}, marge ${formatEuroWhole(selectedMargin.value)} (${formatRate(selectedMargin.rate)})`}
            </Text>
          ) : null}
        </Section>
      ) : null}

      {detail.byOrigin.length > 0 ? (
        <Section title="Par marketplace">
          <Text style={styles.detail}>Appuyer pour restreindre toute la fiche à une marketplace.</Text>
          <View style={styles.steps}>
            {detail.byOrigin.map((entry) => {
              const entryMargin = marginOf(entry, view);
              const selected = detail.origin === entry.origin;
              const siteRate = entry.origin === 'WEBSITE' ? (detail.site?.marginRate ?? null) : null;
              return (
                <Pressable
                  key={entry.origin}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${originLabel(entry.origin)}, ${selected ? 'filtre actif' : 'filtrer'}`}
                  onPress={() => onSelectOrigin(selected ? null : entry.origin)}
                  style={[styles.origin, selected && styles.originSelected]}
                >
                  <View style={styles.step}>
                    <Text style={[styles.stepLabel, styles.strong]}>{originLabel(entry.origin)}</Text>
                    <Text style={styles.stepValue}>{formatEuroWhole(entry.caHT)}</Text>
                    <Text
                      style={[
                        styles.stepValue,
                        styles.originMargin,
                        { color: marginColor(t, entryMargin.value) },
                      ]}
                    >
                      {`${formatEuroWhole(entryMargin.value)} · ${formatRate(entryMargin.rate)}`}
                    </Text>
                  </View>
                  <Text style={styles.detail}>
                    {`${formatInteger(entry.orders)} commandes`}
                    {siteRate != null ? ` · taux site ${formatRate(siteRate)}` : ''}
                    {entry.sav.totalHT !== 0 ? ` · SAV -${formatEuroWhole(entry.sav.totalHT)}` : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: spacing.lg },
  diagnostic: { gap: spacing.sm },
  detail: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted, marginTop: spacing.xs },
  steps: { gap: spacing.sm },
  stepBlock: { gap: 1 },
  step: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  origin: {
    gap: 2,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  originSelected: { borderColor: t.accent, backgroundColor: withAlpha(t.accent, 0.12) },
  stepLabel: { flex: 1, fontSize: fontSize.sm, color: t.text },
  stepValue: { fontSize: fontSize.sm, color: t.text, fontVariant: ['tabular-nums'] },
  originMargin: { minWidth: 110, textAlign: 'right', fontWeight: '600' },
  strong: { fontWeight: '700' },
}));
