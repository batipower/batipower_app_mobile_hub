import { Text, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';

import { EmptyState } from '@/features/preparation/components/ListState';
import { formatEuroWhole, formatInteger, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { HubBrandMarginDetail, HubBrandMarginSavCause } from '@/types/hubBrandMargin';

import { Kpi, KpiGrid, Section } from '../components/primitives';
import { OrderRow, ShowMoreButton, useShowMore } from '../components/rows';
import { SAV_CAUSE_LABELS, type MarginView } from '../lib/model';
import { openBrandOrder } from '../navigation';

type SavTabProps = {
  detail: HubBrandMarginDetail;
  view: MarginView;
};

/** SAV de la marque : décomposition de l'impact, causes et commandes les plus touchées. */
export function SavTab({ detail, view }: SavTabProps) {
  const styles = useStyles();
  const t = useTheme();
  const { sav, caHT } = detail.totals;

  const causes = (Object.entries(sav.byCause) as [HubBrandMarginSavCause, number][])
    .filter(([, amount]) => amount !== 0)
    .sort((a, b) => b[1] - a[1]);
  const maxCause = Math.max(1, ...causes.map(([, amount]) => Math.abs(amount)));

  const more = useShowMore(detail.savOrders);
  const truncated = detail.savOrdersTotal > detail.savOrders.length;

  if (sav.totalHT === 0 && detail.savOrdersTotal === 0 && causes.length === 0) {
    return (
      <EmptyState
        icon={<ShieldCheck size={24} color={t.textMuted} />}
        title="Aucun SAV"
        text="Aucun avoir, renvoi ni remise en stock sur cette période."
      />
    );
  }

  return (
    <View style={styles.root}>
      <KpiGrid>
        <Kpi
          label="Impact SAV"
          value={formatEuroWhole(sav.totalHT)}
          hint={caHT > 0 ? `${formatPercent((sav.totalHT / caHT) * 100)} du CA` : undefined}
          color={sav.totalHT > 0 ? t.warning : undefined}
        />
        <Kpi label="Avoirs" value={formatEuroWhole(sav.creditSlipsHT)} />
        <Kpi label="Remises en stock" value={formatEuroWhole(-sav.restockRecoveredHT)} />
        <Kpi label="Renvois" value={formatEuroWhole(sav.resendCostHT)} />
      </KpiGrid>

      {causes.length > 0 ? (
        <Section title="Par cause">
          <View style={styles.causes}>
            {causes.map(([cause, amount]) => (
              <View key={cause} style={styles.cause}>
                <View style={styles.causeHeader}>
                  <Text style={styles.causeLabel}>{SAV_CAUSE_LABELS[cause] ?? cause}</Text>
                  <Text style={styles.causeValue}>{formatEuroWhole(amount)}</Text>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${Math.min(100, (Math.abs(amount) / maxCause) * 100)}%`,
                        backgroundColor: withAlpha(amount < 0 ? t.accent : t.warning, 0.85),
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {detail.savOrders.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.title}>
            {`Commandes les plus touchées (${formatInteger(detail.savOrdersTotal)})`}
          </Text>
          {truncated ? (
            <Text style={styles.note}>
              {`Les ${formatInteger(detail.savOrders.length)} plus fortes sur ${formatInteger(detail.savOrdersTotal)}.`}
            </Text>
          ) : null}
          {more.visible.map((order) => (
            <OrderRow
              key={order.reference}
              order={order}
              view={view}
              mode="sav"
              onPress={openBrandOrder}
            />
          ))}
          {more.hasMore ? (
            <ShowMoreButton remaining={more.remaining} onPress={more.showMore} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: spacing.lg },
  causes: { gap: spacing.md },
  cause: { gap: 6 },
  causeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  causeLabel: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  causeValue: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  track: { height: 8, borderRadius: radius.full, backgroundColor: t.surfaceStrong },
  fill: { height: 8, borderRadius: radius.full },
  list: { gap: spacing.md },
  title: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  note: { fontSize: fontSize.xs, color: t.textMuted },
}));
