import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  BarRow,
  Panel,
  StatGrid,
  StatTile,
  SubTitle,
} from '@/features/cockpit/components/CockpitPrimitives';
import { humanizeCode } from '@/features/orders/orderDisplay';
import { SegmentedControl, type Segment } from '@/features/preparation/components/SegmentedControl';
import { formatDate, formatEuro, formatInteger, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type {
  PartnerEntryGroupSummary,
  PartnerLatestPriceChangeRow,
  PartnerLatestPriceRow,
  PartnerPriceChangeGroupSummary,
  PartnerStatsRange,
} from '@/types/hubPartnerStats';

import { DataState, EmptyNote } from '../DataState';
import { HubDashboardScreen } from '../HubDashboardScreen';
import {
  usePartnerLatestPriceChanges,
  usePartnerLatestPrices,
  usePartnerOpportunities,
  usePartnerPriceChanges,
  usePartnerPriceChangesByBrand,
  usePartnerPriceChangesByUser,
} from '../hooks';
import { formatIsoDateFr, resolvePartnerPeriod, type PartnerPeriodKey } from './periods';

type SectionKey = 'opportunites' | 'prix';

const PERIODS: readonly Segment<PartnerPeriodKey>[] = [
  { key: '30d', label: '30 j' },
  { key: 'last3m', label: '3 mois' },
  { key: 'last12m', label: '12 mois' },
  { key: 'ytd', label: 'Année' },
];

const SECTIONS: readonly Segment<SectionKey>[] = [
  { key: 'opportunites', label: 'Opportunités' },
  { key: 'prix', label: 'Hausses et baisses' },
];

/** Lignes d'un classement affichées avant « Voir plus ». */
const GROUP_STEP = 5;
/** Lignes d'une liste de dernières déclarations : par pas de 10 (le back plafonne la page). */
const LIST_STEP = 10;

function signedPercent(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${value > 0 ? '+' : ''}${formatPercent(value)}`;
}

/**
 * Vue « Stats PARTNER » de l'accueil HUB (SUPERADMIN), en consultation : usage du module PARTNER
 * (prix renseignés sur opportunités, hausses et baisses de prix d'achat par marque et par
 * utilisateur). Pendant mobile de `PartnerStatsPageContent` du front web, sans filtre fin.
 */
export function PartnerDashboardScreen() {
  const [period, setPeriod] = useState<PartnerPeriodKey>('last3m');
  const [section, setSection] = useState<SectionKey>('opportunites');
  const range = useMemo(() => resolvePartnerPeriod(period), [period]);

  return (
    <HubDashboardScreen
      view="partner"
      subtitle={`Du ${formatIsoDateFr(range.startDate)} au ${formatIsoDateFr(range.endDate)} · montants HT`}
    >
      <SegmentedControl segments={PERIODS} value={period} onChange={setPeriod} />
      <SegmentedControl segments={SECTIONS} value={section} onChange={setSection} />
      {section === 'opportunites' ? (
        <OpportunitiesSection range={range} />
      ) : (
        <PriceChangesSection range={range} />
      )}
    </HubDashboardScreen>
  );
}

// ─── Opportunités ────────────────────────────────────────────────────────────

function OpportunitiesSection({ range }: { range: PartnerStatsRange }) {
  const styles = useStyles();
  const query = usePartnerOpportunities(range);
  const data = query.data ?? null;
  const relativeMax = data
    ? Math.max(
        data.kpis.belowRequestedCount,
        data.kpis.equalRequestedCount,
        data.kpis.aboveRequestedCount,
      )
    : 0;

  return (
    <DataState
      loading={query.isPending}
      hasData={!!data}
      error={query.error}
      fallback="Impossible de charger les prix sur opportunités"
      onRetry={() => void query.refetch()}
      skeletonHeight={220}
    >
      {data ? (
        <>
          <Panel title="Prix sur opportunités">
            <StatGrid>
              <StatTile
                label="Prix renseignés"
                value={formatInteger(data.kpis.proposals)}
                hint={`${formatInteger(data.kpis.opportunities)} opportunités`}
              />
              <StatTile label="Utilisateurs actifs" value={formatInteger(data.kpis.activeUsers)} />
              <StatTile
                label="Écart moyen"
                value={signedPercent(data.kpis.avgGapPercent)}
                hint={`médiane ${signedPercent(data.kpis.medianGapPercent)}`}
              />
              <StatTile
                label="Taux de réussite"
                value={formatPercent(data.kpis.successRatePercent)}
              />
              <StatTile
                label="Prix proposé moyen"
                value={formatEuro(data.kpis.avgProposedPriceHT)}
              />
              <StatTile
                label="Obtenu / proposé"
                value={formatPercent(data.kpis.avgObtainedVsProposedPercent)}
              />
            </StatGrid>

            <View style={styles.block}>
              <SubTitle>Prix proposé par rapport au prix demandé</SubTitle>
              <BarRow
                label="Inférieur"
                value={data.kpis.belowRequestedCount}
                max={relativeMax}
                display={formatInteger(data.kpis.belowRequestedCount)}
                tone="success"
              />
              <BarRow
                label="Égal"
                value={data.kpis.equalRequestedCount}
                max={relativeMax}
                display={formatInteger(data.kpis.equalRequestedCount)}
              />
              <BarRow
                label="Supérieur"
                value={data.kpis.aboveRequestedCount}
                max={relativeMax}
                display={formatInteger(data.kpis.aboveRequestedCount)}
                tone="warning"
              />
            </View>

            {data.gapDistribution.length > 0 ? (
              <View style={styles.block}>
                <SubTitle>Répartition des écarts</SubTitle>
                {data.gapDistribution.map((bucket) => (
                  <BarRow
                    key={bucket.key}
                    label={bucket.label}
                    value={bucket.count}
                    max={Math.max(0, ...data.gapDistribution.map((item) => item.count))}
                    display={formatInteger(bucket.count)}
                  />
                ))}
              </View>
            ) : null}
          </Panel>

          <EntryGroupPanel title="Par marque" groups={data.byBrand} />
          <EntryGroupPanel title="Par utilisateur" groups={data.byUser} />
          <LatestPricesPanel range={range} />
        </>
      ) : null}
    </DataState>
  );
}

function EntryGroupPanel({ title, groups }: { title: string; groups: PartnerEntryGroupSummary[] }) {
  const styles = useStyles();
  const [visible, setVisible] = useState(GROUP_STEP);
  const sorted = useMemo(() => [...groups].sort((a, b) => b.proposals - a.proposals), [groups]);

  return (
    <Panel title={title}>
      {sorted.length === 0 ? (
        <EmptyNote>Aucun prix renseigné sur la période.</EmptyNote>
      ) : (
        <View style={styles.list}>
          {sorted.slice(0, visible).map((group) => (
            <View key={group.key} style={styles.row} accessible>
              <View style={styles.rowText}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {group.label}
                </Text>
                <Text style={styles.rowDetail}>
                  {formatInteger(group.proposals)} prix · écart {signedPercent(group.avgGapPercent)}{' '}
                  · réussite {formatPercent(group.successRatePercent, 0)}
                </Text>
              </View>
              <Text style={styles.rowValue}>{formatEuro(group.avgProposedPriceHT)}</Text>
            </View>
          ))}
          <MoreButton
            remaining={sorted.length - visible}
            onPress={() => setVisible((value) => value + GROUP_STEP)}
          />
        </View>
      )}
    </Panel>
  );
}

function LatestPricesPanel({ range }: { range: PartnerStatsRange }) {
  const styles = useStyles();
  const [limit, setLimit] = useState(LIST_STEP);
  const query = usePartnerLatestPrices(range, limit);
  const rows = query.data?.data ?? [];
  const total = query.data?.meta.total ?? 0;

  return (
    <Panel title="Derniers prix renseignés">
      <DataState
        loading={query.isPending}
        hasData={!!query.data}
        error={query.error}
        fallback="Impossible de charger les derniers prix"
        onRetry={() => void query.refetch()}
        skeletonHeight={120}
      >
        {rows.length === 0 ? (
          <EmptyNote>Aucun prix renseigné sur la période.</EmptyNote>
        ) : (
          <View style={styles.list}>
            {rows.map((row) => (
              <LatestPriceRow key={row.id} row={row} />
            ))}
            <MoreButton
              remaining={total - rows.length}
              onPress={() => setLimit((value) => value + LIST_STEP)}
              loading={query.isFetching}
            />
          </View>
        )}
      </DataState>
    </Panel>
  );
}

function LatestPriceRow({ row }: { row: PartnerLatestPriceRow }) {
  const styles = useStyles();
  return (
    <View style={styles.row} accessible>
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={2}>
          {row.designation ?? row.reference ?? row.brand}
        </Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          {[row.brand, row.reference].filter(Boolean).join(' · ')}
        </Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          {row.userName} · {formatDate(row.at) ?? '—'} · {humanizeCode(row.status)}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowValue}>{formatEuro(row.proposedPriceHT)}</Text>
        <Text style={styles.rowDetail}>{signedPercent(row.gapPercent)}</Text>
      </View>
    </View>
  );
}

// ─── Hausses et baisses de prix d'achat ──────────────────────────────────────

function PriceChangesSection({ range }: { range: PartnerStatsRange }) {
  const styles = useStyles();
  const query = usePartnerPriceChanges(range);
  const data = query.data ?? null;

  return (
    <DataState
      loading={query.isPending}
      hasData={!!data}
      error={query.error}
      fallback="Impossible de charger les hausses et baisses"
      onRetry={() => void query.refetch()}
      skeletonHeight={220}
    >
      {data ? (
        <>
          <Panel title="Hausses et baisses de prix d'achat">
            <StatGrid>
              <StatTile
                label="Déclarations"
                value={formatInteger(data.kpis.total)}
                hint={`${formatInteger(data.kpis.brandsConcerned)} marques`}
              />
              <StatTile label="Utilisateurs actifs" value={formatInteger(data.kpis.activeUsers)} />
              <StatTile
                label="Hausses"
                value={formatInteger(data.kpis.increases)}
                hint={`moy. ${signedPercent(data.kpis.avgIncreasePercent)}`}
                tone="warning"
              />
              <StatTile
                label="Baisses"
                value={formatInteger(data.kpis.decreases)}
                hint={`moy. ${signedPercent(data.kpis.avgDecreasePercent)}`}
                tone="success"
              />
              <StatTile
                label="Hausse maximale"
                value={signedPercent(data.kpis.maxIncreasePercent)}
              />
              <StatTile
                label="Baisse maximale"
                value={signedPercent(data.kpis.maxDecreasePercent)}
              />
            </StatGrid>

            {data.bySource.length > 0 ? (
              <View style={styles.block}>
                <SubTitle>Origine des déclarations</SubTitle>
                {data.bySource.map((item) => (
                  <BarRow
                    key={item.source}
                    label={humanizeCode(item.source)}
                    value={item.count}
                    max={Math.max(0, ...data.bySource.map((entry) => entry.count))}
                    display={formatInteger(item.count)}
                  />
                ))}
              </View>
            ) : null}
          </Panel>

          <PriceChangeBrandsPanel range={range} />
          <PriceChangeUsersPanel range={range} />
          <LatestPriceChangesPanel range={range} />
        </>
      ) : null}
    </DataState>
  );
}

function PriceChangeBrandsPanel({ range }: { range: PartnerStatsRange }) {
  const query = usePartnerPriceChangesByBrand(range);
  return (
    <ChangeGroupPanel
      title="Par marque"
      groups={query.data?.brands ?? null}
      loading={query.isPending}
      error={query.error}
      onRetry={() => void query.refetch()}
    />
  );
}

function PriceChangeUsersPanel({ range }: { range: PartnerStatsRange }) {
  const query = usePartnerPriceChangesByUser(range);
  return (
    <ChangeGroupPanel
      title="Par utilisateur"
      groups={query.data?.users ?? null}
      loading={query.isPending}
      error={query.error}
      onRetry={() => void query.refetch()}
    />
  );
}

function ChangeGroupPanel({
  title,
  groups,
  loading,
  error,
  onRetry,
}: {
  title: string;
  groups: PartnerPriceChangeGroupSummary[] | null;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const styles = useStyles();
  const [visible, setVisible] = useState(GROUP_STEP);
  const sorted = useMemo(() => [...(groups ?? [])].sort((a, b) => b.total - a.total), [groups]);

  return (
    <Panel title={title}>
      <DataState
        loading={loading}
        hasData={!!groups}
        error={error}
        fallback="Chargement impossible"
        onRetry={onRetry}
        skeletonHeight={100}
      >
        {sorted.length === 0 ? (
          <EmptyNote>Aucune déclaration sur la période.</EmptyNote>
        ) : (
          <View style={styles.list}>
            {sorted.slice(0, visible).map((group) => (
              <View key={group.key} style={styles.row} accessible>
                <View style={styles.rowText}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {group.label}
                  </Text>
                  <Text style={styles.rowDetail}>
                    {formatInteger(group.increases)} hausse{group.increases > 1 ? 's' : ''} (
                    {signedPercent(group.avgIncreasePercent)}) · {formatInteger(group.decreases)}{' '}
                    baisse{group.decreases > 1 ? 's' : ''} (
                    {signedPercent(group.avgDecreasePercent)})
                  </Text>
                </View>
                <Text style={styles.rowValue}>{formatInteger(group.total)}</Text>
              </View>
            ))}
            <MoreButton
              remaining={sorted.length - visible}
              onPress={() => setVisible((value) => value + GROUP_STEP)}
            />
          </View>
        )}
      </DataState>
    </Panel>
  );
}

function LatestPriceChangesPanel({ range }: { range: PartnerStatsRange }) {
  const styles = useStyles();
  const [limit, setLimit] = useState(LIST_STEP);
  const query = usePartnerLatestPriceChanges(range, limit);
  const rows = query.data?.data ?? [];
  const total = query.data?.meta.total ?? 0;

  return (
    <Panel title="Dernières déclarations">
      <DataState
        loading={query.isPending}
        hasData={!!query.data}
        error={query.error}
        fallback="Impossible de charger les dernières déclarations"
        onRetry={() => void query.refetch()}
        skeletonHeight={120}
      >
        {rows.length === 0 ? (
          <EmptyNote>Aucune déclaration sur la période.</EmptyNote>
        ) : (
          <View style={styles.list}>
            {rows.map((row) => (
              <LatestChangeRow key={row.id} row={row} />
            ))}
            <MoreButton
              remaining={total - rows.length}
              onPress={() => setLimit((value) => value + LIST_STEP)}
              loading={query.isFetching}
            />
          </View>
        )}
      </DataState>
    </Panel>
  );
}

function LatestChangeRow({ row }: { row: PartnerLatestPriceChangeRow }) {
  const styles = useStyles();
  const t = useTheme();
  const up = row.increasePercent > 0;
  return (
    <View style={styles.row} accessible>
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={2}>
          {row.designation ?? row.reference}
        </Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          {[row.brand, row.reference].filter(Boolean).join(' · ')}
        </Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          {row.userName} · {formatDate(row.at) ?? '—'} · {humanizeCode(row.status)}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowValue, { color: up ? t.warning : t.success }]}>
          {signedPercent(row.increasePercent)}
        </Text>
        <Text style={styles.rowDetail}>
          {formatEuro(row.currentFixPriceHT)} → {formatEuro(row.proposedFixPriceHT)}
        </Text>
      </View>
    </View>
  );
}

// ─── Commun ──────────────────────────────────────────────────────────────────

function MoreButton({
  remaining,
  onPress,
  loading = false,
}: {
  remaining: number;
  onPress: () => void;
  loading?: boolean;
}) {
  const styles = useStyles();
  if (remaining <= 0) return null;
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      style={[styles.more, loading && styles.moreLoading]}
    >
      <Text style={styles.moreText}>Voir plus ({formatInteger(remaining)})</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  block: { gap: spacing.md },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.surface,
  },
  rowText: { flex: 1, gap: 1 },
  rowRight: { alignItems: 'flex-end', gap: 1, maxWidth: '45%' },
  rowName: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  rowDetail: { fontSize: 11, lineHeight: 15, color: t.textSubtle },
  rowValue: { fontSize: fontSize.sm, fontWeight: '800', color: t.text },
  more: { alignSelf: 'center', paddingVertical: spacing.sm },
  moreLoading: { opacity: 0.5 },
  moreText: { fontSize: fontSize.sm, fontWeight: '700', color: t.accentText },
}));
