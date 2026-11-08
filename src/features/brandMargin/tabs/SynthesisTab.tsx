import { useState } from 'react';
import { Text, View } from 'react-native';

import { formatEuroWhole, formatInteger } from '@/lib/format';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { HubBrandMarginDetail, HubBrandMarginFigures } from '@/types/hubBrandMargin';

import { MonthlyChart } from '../components/MonthlyChart';
import { AlertBadges, CostBars, Kpi, KpiGrid, Section } from '../components/primitives';
import { brandAlerts, costRatios, marginSteps } from '../lib/diagnostic';
import { formatMonthLabel, formatRate, formatSignedEuro, marginColor } from '../lib/display';
import { marginOf, originLabel, type MarginView } from '../lib/model';

type SynthesisTabProps = {
  detail: HubBrandMarginDetail;
  /** Moyenne de toutes les marques (même marketplace) : absente tant que la vue d'ensemble charge. */
  average: HubBrandMarginFigures | null;
  view: MarginView;
};

/** Synthèse d'une marque : chiffres clés, diagnostic, cascade de la marge, coûts, mois et marketplaces. */
export function SynthesisTab({ detail, average, view }: SynthesisTabProps) {
  const styles = useStyles();
  const t = useTheme();
  const { totals } = detail;
  const margin = marginOf(totals, view);
  const alerts = average ? brandAlerts(totals, average, view) : [];
  const steps = marginSteps(totals, view);
  const [picked, setPicked] = useState<string | null>(null);
  const selectedMonth =
    detail.monthly.find((month) => month.month === picked) ?? detail.monthly.at(-1) ?? null;
  const selectedMargin = selectedMonth ? marginOf(selectedMonth, view) : null;

  return (
    <View style={styles.root}>
      <KpiGrid>
        <Kpi label="CA HT" value={formatEuroWhole(totals.caHT)} />
        <Kpi
          label={`Marge ${view === 'net' ? 'nette' : 'brute'}`}
          value={formatEuroWhole(margin.value)}
          hint={formatRate(margin.rate)}
          color={marginColor(t, margin.value)}
        />
        <Kpi
          label="Impact SAV"
          value={formatEuroWhole(totals.sav.totalHT)}
          hint={
            totals.caHT > 0
              ? `${formatRate((totals.sav.totalHT / totals.caHT) * 100)} du CA`
              : undefined
          }
        />
        <Kpi
          label="Commandes"
          value={formatInteger(totals.orders)}
          hint={`${formatInteger(totals.units)} unités`}
        />
      </KpiGrid>

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
          {steps.map((step) => (
            <View key={step.id} style={styles.step}>
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
          ))}
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
          <View style={styles.steps}>
            {detail.byOrigin.map((entry) => {
              const entryMargin = marginOf(entry, view);
              return (
                <View key={entry.origin} style={styles.step}>
                  <Text style={styles.stepLabel}>{originLabel(entry.origin)}</Text>
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
  step: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  stepLabel: { flex: 1, fontSize: fontSize.sm, color: t.text },
  stepValue: { fontSize: fontSize.sm, color: t.text, fontVariant: ['tabular-nums'] },
  originMargin: { minWidth: 110, textAlign: 'right', fontWeight: '600' },
  strong: { fontWeight: '700' },
}));
