import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Badge, Card } from '@/components/ui';
import { formatPercent } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, typography, useTheme, withAlpha } from '@/theme';

import {
  COST_LINE_IDS,
  COST_LINE_LABELS,
  type BrandAlert,
  type CostRatios,
} from '../lib/diagnostic';

type KpiProps = {
  label: string;
  value: string;
  /** Deuxième ligne discrète (taux, écart, volume). */
  hint?: string;
  /** Couleur de la valeur (rouge pour une marge négative). */
  color?: string;
};

/** Tuile de chiffre clé : libellé en capitales, valeur, indication. */
export function Kpi({ label, value, hint, color }: KpiProps) {
  const styles = useStyles();
  return (
    <View style={styles.kpi} accessible accessibilityLabel={`${label} : ${value}`}>
      <Text style={styles.kpiLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[styles.kpiValue, color ? { color } : null]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
      {hint ? (
        <Text style={styles.kpiHint} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** Grille de tuiles, deux par ligne. */
export function KpiGrid({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.grid}>{children}</View>;
}

/** Pastilles d'alerte d'une marque (marge négative, SAV élevé…). */
export function AlertBadges({ alerts }: { alerts: readonly BrandAlert[] }) {
  const styles = useStyles();
  if (alerts.length === 0) return null;
  return (
    <View style={styles.badges}>
      {alerts.map((alert) => (
        <Badge
          key={alert.id}
          label={alert.label}
          tone={alert.severity === 'bad' ? 'red' : 'amber'}
        />
      ))}
    </View>
  );
}

type CostBarsProps = {
  own: CostRatios;
  average: CostRatios;
};

/** Postes de coût en % du CA : barre de la marque, repère de la moyenne de toutes les marques. */
export function CostBars({ own, average }: CostBarsProps) {
  const styles = useStyles();
  const t = useTheme();
  const scale = Math.max(
    1,
    ...COST_LINE_IDS.flatMap((id) => [own[id] ?? 0, average[id] ?? 0].map((v) => Math.max(0, v))),
  );

  return (
    <View style={styles.costs}>
      {COST_LINE_IDS.map((id) => {
        const value = own[id];
        const reference = average[id];
        const worse = value != null && reference != null && value - reference >= 2;
        const color = worse ? t.warning : t.accent;
        return (
          <View
            key={id}
            style={styles.costRow}
            accessible
            accessibilityLabel={`${COST_LINE_LABELS[id]} : ${formatPercent(value)} du CA, moyenne ${formatPercent(reference)}`}
          >
            <View style={styles.costHeader}>
              <Text style={styles.costLabel}>{COST_LINE_LABELS[id]}</Text>
              <Text style={styles.costValue}>
                {formatPercent(value)}
                <Text style={styles.costAverage}>{`  moy. ${formatPercent(reference)}`}</Text>
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.min(100, (Math.max(0, value ?? 0) / scale) * 100)}%`,
                    backgroundColor: withAlpha(color, 0.85),
                  },
                ]}
              />
              {reference != null ? (
                <View
                  style={[
                    styles.marker,
                    { left: `${Math.min(100, (Math.max(0, reference) / scale) * 100)}%` },
                  ]}
                />
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Carte titrée d'une section de la fiche marque. */
export function Section({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
        {trailing}
      </View>
      <Card>{children}</Card>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kpi: {
    flexGrow: 1,
    flexBasis: '47%',
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.border,
  },
  kpiLabel: { ...typography.label, color: t.textMuted },
  kpiValue: { fontSize: fontSize.xl, fontWeight: '700', color: t.text },
  kpiHint: { fontSize: fontSize.xs, color: t.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  costs: { gap: spacing.md },
  costRow: { gap: 6 },
  costHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  costLabel: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  costValue: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  costAverage: { fontSize: fontSize.xs, fontWeight: '400', color: t.textMuted },
  track: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: t.surfaceStrong,
    overflow: 'visible',
  },
  fill: { height: 8, borderRadius: radius.full },
  marker: { position: 'absolute', top: -3, width: 2, height: 14, backgroundColor: t.text },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...typography.label, color: t.textMuted },
}));
