import { Text, View } from 'react-native';

import { humanizeCode, returnLabelStatusLabel } from '@/features/orders/orderDisplay';
import { formatInteger, formatPercent, formatShipHours } from '@/lib/format';
import { fontSize, makeStyles, spacing } from '@/theme';
import type { HubDashboardSav } from '@/types/hubDashboard';

import { BarRow, DeltaChip, Panel, StatGrid, StatTile, SubTitle } from './CockpitPrimitives';

/** Libellés des causes de casse connues ; les autres sont humanisées. */
const CAUSE_LABELS: Record<string, string> = {
  BAD_TRANSPORT: 'Mauvais transport',
  TECHNICAL_FAILURE: 'Panne technique',
  BROKEN_OTHER: 'Casse (autre)',
  NOT_RESELLABLE: 'Non revendable',
};

type SavCardProps = {
  sav: HubDashboardSav;
};

/** SAV du mois : taux de retour, volumes, délai de traitement, pipeline et causes de casse. */
export function SavCard({ sav }: SavCardProps) {
  const styles = useStyles();

  const pipeline = Object.entries(sav.returnLabelPipeline)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);
  const pipelineMax = Math.max(0, ...pipeline.map(([, count]) => count));
  const causes = sav.topBrokenCauses.filter((item) => item.count > 0);
  const causesMax = Math.max(0, ...causes.map((item) => item.count));

  return (
    <Panel title="SAV">
      <View style={styles.rate}>
        <View>
          <Text style={styles.rateLabel}>Taux de retour du mois</Text>
          <Text style={styles.rateValue}>{formatPercent(sav.returnRateMonthPct)}</Text>
        </View>
        <View style={styles.rateDelta}>
          {/* Un taux qui monte est une mauvaise nouvelle. */}
          <DeltaChip
            current={sav.returnRateMonthPct}
            previous={sav.returnRatePrevMonthPct}
            goodWhen="down"
            context="par rapport au mois dernier"
          />
          <Text style={styles.rateHint}>
            Mois dernier : {formatPercent(sav.returnRatePrevMonthPct)}
          </Text>
        </View>
      </View>

      <StatGrid>
        <StatTile
          label="Retours"
          value={formatInteger(sav.returnsThisMonth)}
          hint={`sur ${formatInteger(sav.ordersThisMonth)} commandes`}
        />
        <StatTile label="Remboursements" value={formatInteger(sav.refundsThisMonth)} />
        <StatTile
          label="Délai de traitement"
          value={formatShipHours(sav.avgTreatmentHours)}
          hint="en moyenne"
        />
      </StatGrid>

      {pipeline.length > 0 ? (
        <View style={styles.block}>
          <SubTitle>Pipeline des retours</SubTitle>
          {pipeline.map(([status, count]) => (
            <BarRow
              key={status}
              label={returnLabelStatusLabel(status)}
              value={count}
              max={pipelineMax}
            />
          ))}
        </View>
      ) : null}

      {causes.length > 0 ? (
        <View style={styles.block}>
          <SubTitle>Causes de casse</SubTitle>
          {causes.map((item) => (
            <BarRow
              key={item.cause}
              label={CAUSE_LABELS[item.cause] ?? humanizeCode(item.cause)}
              value={item.count}
              max={causesMax}
              tone="warning"
            />
          ))}
        </View>
      ) : null}
    </Panel>
  );
}

const useStyles = makeStyles((t) => ({
  rate: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rateLabel: { fontSize: 11, fontWeight: '600', color: t.textSubtle },
  rateValue: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5, color: t.text },
  rateDelta: { alignItems: 'flex-end', gap: 3 },
  rateHint: { fontSize: fontSize.xs, color: t.textSubtle },
  block: { gap: spacing.md },
}));
