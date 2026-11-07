import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  BarRow,
  MarginToggle,
  Panel,
  StatGrid,
  StatTile,
  SubTitle,
} from '@/features/cockpit/components/CockpitPrimitives';
import { humanizeCode } from '@/features/orders/orderDisplay';
import { SegmentedControl, type Segment } from '@/features/preparation/components/SegmentedControl';
import { formatDateTime, formatEuroWhole, formatInteger, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing } from '@/theme';
import type {
  SiteQualityGrade,
  WebsiteDashboardPeriod,
  WebsiteDashboardReport,
  WebsiteRankingRow,
} from '@/types/hubWebsiteDashboard';

import { DataState, EmptyNote } from '../DataState';
import { HubDashboardScreen } from '../HubDashboardScreen';
import { useWebsiteDashboard } from '../hooks';

const PERIODS: readonly Segment<WebsiteDashboardPeriod>[] = [
  { key: '30d', label: '30 j' },
  { key: '90d', label: '90 j' },
  { key: '12m', label: '12 mois' },
];

const GRADES: readonly SiteQualityGrade[] = ['A', 'B', 'C', 'D'];
const GRADE_TONE = { A: 'success', B: 'default', C: 'warning', D: 'danger' } as const;

const RANKING_STEP = 10;

/**
 * Vue « Site » de l'accueil HUB (SUPERADMIN), en consultation : notes des fiches, ruptures de
 * stock, déploiement du catalogue et palmarès des produits vendus uniquement sur le site.
 * Pendant mobile de `WebsiteDashboard` du front web ; les marges restent derrière la bascule.
 */
export function SiteDashboardScreen() {
  const [period, setPeriod] = useState<WebsiteDashboardPeriod>('90d');
  const query = useWebsiteDashboard(period);
  const report = query.data ?? null;
  const updated = report ? formatDateTime(report.generatedAt) : null;

  return (
    <HubDashboardScreen view="site" subtitle={updated ? `Calculé le ${updated}` : null}>
      <SegmentedControl segments={PERIODS} value={period} onChange={setPeriod} />

      <DataState
        loading={query.isPending}
        hasData={!!report}
        error={query.error}
        fallback="Impossible de charger la vue Site"
        onRetry={() => void query.refetch()}
        skeletonHeight={260}
      >
        {report ? <SiteContent report={report} /> : null}
      </DataState>
    </HubDashboardScreen>
  );
}

function SiteContent({ report }: { report: WebsiteDashboardReport }) {
  const [showMargin, setShowMargin] = useState(false);
  return (
    <>
      <QualityPanel report={report} />
      <CatalogPanel report={report} />
      <ServicePanel report={report} />
      <RankingPanel
        report={report}
        showMargin={showMargin}
        onToggleMargin={() => setShowMargin((value) => !value)}
      />
    </>
  );
}

function QualityPanel({ report }: { report: WebsiteDashboardReport }) {
  const styles = useStyles();
  const { quality } = report;
  const max = Math.max(0, ...GRADES.map((grade) => quality.gradeDistribution[grade] ?? 0));

  return (
    <Panel title="Qualité des fiches du site">
      <StatGrid>
        <StatTile
          label="Note moyenne"
          value={quality.average === null ? '—' : `${Math.round(quality.average)} / 100`}
          hint={`${formatInteger(quality.ratedCount)} fiches notées`}
        />
        <StatTile
          label="Sans note"
          value={formatInteger(quality.unratedCount)}
          hint={`sur ${formatInteger(quality.activeProducts)} produits actifs`}
          tone={quality.unratedCount > 0 ? 'warning' : 'default'}
        />
      </StatGrid>

      <View style={styles.block}>
        <SubTitle>Répartition des notes</SubTitle>
        {GRADES.map((grade) => (
          <BarRow
            key={grade}
            label={`Note ${grade}`}
            value={quality.gradeDistribution[grade] ?? 0}
            max={max}
            display={formatInteger(quality.gradeDistribution[grade] ?? 0)}
            tone={GRADE_TONE[grade]}
          />
        ))}
      </View>

      {quality.lowest ? (
        <ProductNote
          label="Fiche la moins bien notée"
          reference={quality.lowest.reference}
          designation={quality.lowest.designation}
          score={quality.lowest.score}
        />
      ) : null}
      {quality.highest ? (
        <ProductNote
          label="Fiche la mieux notée"
          reference={quality.highest.reference}
          designation={quality.highest.designation}
          score={quality.highest.score}
        />
      ) : null}
      {quality.unresolvedCount > 0 ? (
        <Text style={styles.hint}>
          {formatInteger(quality.unresolvedCount)} fiche{quality.unresolvedCount > 1 ? 's' : ''} en
          ligne introuvable{quality.unresolvedCount > 1 ? 's' : ''} sur PrestaShop (sans note).
        </Text>
      ) : null}
    </Panel>
  );
}

function ProductNote(props: {
  label: string;
  reference: string;
  designation: string | null;
  score: number;
}) {
  const styles = useStyles();
  return (
    <View style={styles.note} accessible>
      <View style={styles.noteText}>
        <Text style={styles.noteLabel}>{props.label}</Text>
        <Text style={styles.noteName} numberOfLines={2}>
          {props.designation ?? props.reference}
        </Text>
        <Text style={styles.noteRef} numberOfLines={1}>
          {props.reference}
        </Text>
      </View>
      <Text style={styles.noteScore}>{Math.round(props.score)}</Text>
    </View>
  );
}

function CatalogPanel({ report }: { report: WebsiteDashboardReport }) {
  const { stock, catalog } = report;
  return (
    <Panel title="Stock et déploiement">
      <StatGrid>
        {stock ? (
          <>
            <StatTile
              label="Ruptures de stock"
              value={formatInteger(stock.outOfStock)}
              hint={
                stock.outOfStockPct === null
                  ? `sur ${formatInteger(stock.indexedProducts)} produits`
                  : `${formatPercent(stock.outOfStockPct)} des ${formatInteger(stock.indexedProducts)} produits`
              }
              tone={stock.outOfStock > 0 ? 'warning' : 'default'}
            />
            <StatTile
              label="Stock forcé à 0"
              value={formatInteger(stock.forcedZero)}
              hint="manuellement"
            />
          </>
        ) : null}
        <StatTile
          label="Produits déployés"
          value={formatInteger(catalog.deployed)}
          hint={`sur ${formatInteger(catalog.total)} au catalogue`}
        />
        <StatTile
          label="Non déployés"
          value={formatInteger(catalog.notDeployed)}
          hint={
            catalog.notDeployedPct === null
              ? undefined
              : `${formatPercent(catalog.notDeployedPct)} du catalogue`
          }
          tone={catalog.notDeployed > 0 ? 'warning' : 'default'}
        />
      </StatGrid>
      {stock ? null : (
        <EmptyNote>Index de recherche du site injoignable : stock indisponible.</EmptyNote>
      )}
    </Panel>
  );
}

function ServicePanel({ report }: { report: WebsiteDashboardReport }) {
  const styles = useStyles();
  const rows = [...report.byService].sort((a, b) => b.total - a.total);
  const max = Math.max(0, ...rows.map((row) => row.total));

  return (
    <Panel title="Déploiement par service">
      {rows.length === 0 ? (
        <EmptyNote>Aucun service.</EmptyNote>
      ) : (
        <View style={styles.block}>
          {rows.map((row) => (
            <BarRow
              key={row.service}
              label={row.service === 'AUCUN' ? 'Sans service' : humanizeCode(row.service)}
              value={row.deployed}
              max={max}
              display={`${formatInteger(row.deployed)} / ${formatInteger(row.total)}`}
            />
          ))}
        </View>
      )}
    </Panel>
  );
}

function RankingPanel({
  report,
  showMargin,
  onToggleMargin,
}: {
  report: WebsiteDashboardReport;
  showMargin: boolean;
  onToggleMargin: () => void;
}) {
  const styles = useStyles();
  const [visible, setVisible] = useState(RANKING_STEP);
  const rows = report.siteOnlyRanking;

  return (
    <Panel
      title="Vendus uniquement sur le site"
      trailing={<MarginToggle visible={showMargin} onToggle={onToggleMargin} />}
    >
      {rows.length === 0 ? (
        <EmptyNote>Aucun produit vendu uniquement sur le site sur la période.</EmptyNote>
      ) : (
        <View style={styles.list}>
          {rows.slice(0, visible).map((row, index) => (
            <RankingRow key={row.reference} rank={index + 1} row={row} showMargin={showMargin} />
          ))}
          {visible < rows.length ? (
            <Pressable
              onPress={() => setVisible((value) => value + RANKING_STEP)}
              accessibilityRole="button"
              style={styles.more}
            >
              <Text style={styles.moreText}>
                Voir plus ({formatInteger(rows.length - visible)})
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </Panel>
  );
}

function RankingRow({
  rank,
  row,
  showMargin,
}: {
  rank: number;
  row: WebsiteRankingRow;
  showMargin: boolean;
}) {
  const styles = useStyles();
  const detail = [
    `${formatInteger(row.quantity)} vendu${row.quantity > 1 ? 's' : ''}`,
    `${formatInteger(row.orders)} cmd`,
    showMargin
      ? `marge ${formatEuroWhole(row.realizedMarginHT)}${
          row.realizedMarginPct === null ? '' : ` (${formatPercent(row.realizedMarginPct)})`
        }`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.row} accessible>
      <Text style={styles.rank}>{rank}</Text>
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={2}>
          {row.designation ?? row.reference}
        </Text>
        <Text style={styles.rowRef} numberOfLines={1}>
          {[row.brand, row.reference].filter(Boolean).join(' · ')}
        </Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      <Text style={styles.rowCa}>{formatEuroWhole(row.turnoverHT)}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  block: { gap: spacing.md },
  hint: { fontSize: 11, color: t.textSubtle },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.surface,
  },
  noteText: { flex: 1, gap: 1 },
  noteLabel: { fontSize: 11, fontWeight: '600', color: t.textSubtle },
  noteName: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  noteRef: { fontSize: 11, color: t.textSubtle },
  noteScore: { fontSize: fontSize.xl, fontWeight: '800', color: t.text },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.surface,
  },
  rank: { width: 22, fontSize: fontSize.xs, fontWeight: '800', color: t.textSubtle },
  rowText: { flex: 1, gap: 1 },
  rowName: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  rowRef: { fontSize: 11, color: t.textSubtle },
  rowDetail: { fontSize: 11, color: t.textMuted },
  rowCa: { fontSize: fontSize.sm, fontWeight: '800', color: t.text },
  more: { alignSelf: 'center', paddingVertical: spacing.sm },
  moreText: { fontSize: fontSize.sm, fontWeight: '700', color: t.accentText },
}));
