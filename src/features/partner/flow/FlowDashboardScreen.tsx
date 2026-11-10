import { useMemo, useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/auth/AuthProvider';
import { canViewPartnerFlowDashboard } from '@/auth/permissions';
import { Chip } from '@/components/ui';
import {
  BarRow,
  Panel,
  StatGrid,
  StatTile,
} from '@/features/cockpit/components/CockpitPrimitives';
import { categoryTypeLabel } from '@/features/discussions/shared/format';
import { DataState, EmptyNote } from '@/features/hubDashboards/DataState';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import {
  SegmentedControl,
  type Segment,
} from '@/features/preparation/components/SegmentedControl';
import { formatEuroWhole, formatInteger } from '@/lib/format';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { FlowDashboardCountryCode } from '@/types/flowDashboard';

import {
  availableMonthKeys,
  COUNTRY_LABELS,
  COUNTRY_ORDER,
  computeTotals,
  mergeCountries,
  mergeMonths,
  mergeServices,
  monthShortLabel,
  periodLabel,
  selectWarehouses,
  WAREHOUSE_LABELS,
  WAREHOUSE_ORDER,
  type WarehouseFilter,
} from './flowSimple';
import { FLOW_DASHBOARD_KEY, useFlowDashboard } from './useFlowDashboard';

/** Période choisie : toute l'année en cours, ou un seul mois (`YYYY-MM`). */
type PeriodChoice = 'year' | string;

/**
 * Dashboard flux du module PARTNER (SUPERADMIN et RAF), vue simplifiée du web : entrées par pays
 * et par service, achats et ruptures par mois. En consultation, jamais de prix de vente. Un RAF
 * ne reçoit que son entrepôt : le sélecteur d'entrepôt n'apparaît qu'avec plusieurs entrepôts.
 */
export function FlowDashboardScreen() {
  const { user } = useAuth();
  if (!user) return null;
  if (!canViewPartnerFlowDashboard(user.role)) {
    return (
      <AccessDenied text="Le dashboard flux est réservé aux comptes Super Admin et Responsable achat référent." />
    );
  }
  return <FlowDashboardContent />;
}

function FlowDashboardContent() {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const monthKeys = useMemo(() => availableMonthKeys(), []);
  const [period, setPeriod] = useState<PeriodChoice>('year');
  const [country, setCountry] = useState<FlowDashboardCountryCode | null>(null);
  const [warehouse, setWarehouse] = useState<WarehouseFilter>('ALL');

  const months = period === 'year' ? monthKeys : [period];
  const query = useFlowDashboard(months, country);
  const data = query.data ?? null;

  const { refreshing, onRefresh } = usePullToRefresh(() =>
    queryClient.refetchQueries({ queryKey: FLOW_DASHBOARD_KEY, type: 'active' }),
  );

  const availableWarehouses = useMemo(
    () => WAREHOUSE_ORDER.filter((id) => data?.warehouses.some((item) => item.warehouse === id)),
    [data],
  );
  // Un entrepôt choisi puis absent de la réponse (filtre pays, compte restreint) : retour à « Tous ».
  const activeWarehouse: WarehouseFilter =
    warehouse !== 'ALL' && !availableWarehouses.includes(warehouse) ? 'ALL' : warehouse;

  const warehouseSegments = useMemo<Segment<WarehouseFilter>[]>(
    () => [
      { key: 'ALL', label: 'Tous' },
      ...availableWarehouses.map((id) => ({ key: id, label: WAREHOUSE_LABELS[id] })),
    ],
    [availableWarehouses],
  );

  const selected = useMemo(
    () => (data ? selectWarehouses(data.warehouses, activeWarehouse) : []),
    [data, activeWarehouse],
  );
  const countries = useMemo(() => mergeCountries(selected), [selected]);
  const services = useMemo(() => mergeServices(selected), [selected]);
  const monthly = useMemo(() => mergeMonths(selected), [selected]);
  const totals = useMemo(() => computeTotals(countries, monthly), [countries, monthly]);

  const maxCountry = Math.max(0, ...countries.map((entry) => entry.ordersIn));
  const maxService = Math.max(0, ...services.map((entry) => entry.ordersIn));
  const maxPurchases = Math.max(0, ...monthly.map((entry) => entry.purchasesHT));
  const generatedAt = data ? new Date(data.generatedAt) : null;

  return (
    <ScrollView
      style={styles.scroll}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing['2xl'] }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={t.accentText}
        />
      }
    >
      <Text style={styles.subtitle}>
        {`${periodLabel(months)} · entrées d'entrepôt, jamais de prix de vente`}
        {generatedAt && !Number.isNaN(generatedAt.getTime())
          ? ` · à jour à ${generatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
          : ''}
      </Text>

      <FilterRow>
        <Chip label="Année" active={period === 'year'} onPress={() => setPeriod('year')} />
        {[...monthKeys].reverse().map((key) => (
          <Chip
            key={key}
            label={monthShortLabel(key)}
            active={period === key}
            onPress={() => setPeriod(key)}
          />
        ))}
      </FilterRow>

      <FilterRow>
        <Chip label="Tous pays" active={country === null} onPress={() => setCountry(null)} />
        {COUNTRY_ORDER.map((code) => (
          <Chip
            key={code}
            label={COUNTRY_LABELS[code]}
            active={country === code}
            onPress={() => setCountry(code)}
          />
        ))}
      </FilterRow>

      {warehouseSegments.length > 2 ? (
        <SegmentedControl
          segments={warehouseSegments}
          value={activeWarehouse}
          onChange={setWarehouse}
        />
      ) : null}

      <DataState
        loading={query.isPending}
        hasData={!!data}
        error={query.error}
        fallback="Impossible de charger le dashboard flux"
        onRetry={() => void query.refetch()}
        skeletonHeight={240}
      >
        <Panel title="Entrées">
          <StatGrid>
            <StatTile label="Commandes" value={formatInteger(totals.orders)} />
            <StatTile label="Unités" value={formatInteger(totals.units)} />
            <StatTile label="Colis" value={formatInteger(totals.colis)} />
            <StatTile label="Achats HT" value={formatEuroWhole(totals.purchasesHT)} />
            <StatTile label="BL fournisseurs" value={formatInteger(totals.deliveryNotes)} />
            <StatTile
              label="Références en rupture"
              value={totals.ruptures === null ? '—' : formatInteger(totals.ruptures)}
              tone={totals.ruptures ? 'warning' : 'default'}
            />
          </StatGrid>
        </Panel>

        <Panel title="Par pays">
          {countries.length === 0 ? (
            <EmptyNote>Aucune entrée sur la période.</EmptyNote>
          ) : (
            <View style={styles.block}>
              {countries.map((entry) => (
                <BarRow
                  key={entry.country}
                  label={COUNTRY_LABELS[entry.country]}
                  value={entry.ordersIn}
                  max={maxCountry}
                  display={`${formatInteger(entry.ordersIn)} cmd · ${formatInteger(entry.unitsIn)} u.`}
                />
              ))}
            </View>
          )}
        </Panel>

        <Panel title="Par service">
          {services.length === 0 ? (
            <EmptyNote>Aucune entrée sur la période.</EmptyNote>
          ) : (
            <View style={styles.block}>
              {services.map((entry) => (
                <BarRow
                  key={entry.categoryType ?? '__NONE__'}
                  label={entry.categoryType ? categoryTypeLabel(entry.categoryType) : 'Sans service'}
                  value={entry.ordersIn}
                  max={maxService}
                  display={`${formatInteger(entry.ordersIn)} cmd · ${formatInteger(entry.colisIn)} colis`}
                />
              ))}
            </View>
          )}
        </Panel>

        {monthly.length > 1 ? (
          <Panel title="Achats HT par mois">
            <View style={styles.block}>
              {monthly.map((entry) => (
                <BarRow
                  key={entry.month}
                  label={monthShortLabel(entry.month)}
                  value={entry.purchasesHT}
                  max={maxPurchases}
                  display={`${formatEuroWhole(entry.purchasesHT)} · ${formatInteger(entry.deliveryNotes)} BL`}
                />
              ))}
            </View>
          </Panel>
        ) : null}
      </DataState>
    </ScrollView>
  );
}

/** Ligne de puces défilante, qui déborde jusqu'aux bords de l'écran. */
function FilterRow({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipsBleed}
      contentContainerStyle={styles.chips}
      accessibilityRole="tablist"
    >
      {children}
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  scroll: { flex: 1, backgroundColor: t.bg },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.lg },
  subtitle: { fontSize: fontSize.xs, color: t.textSubtle },
  chipsBleed: { marginHorizontal: -spacing.xl, flexGrow: 0 },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.xl },
  block: { gap: spacing.md },
}));
