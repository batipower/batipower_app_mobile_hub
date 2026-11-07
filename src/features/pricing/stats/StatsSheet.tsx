import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Switch, Text, View } from 'react-native';
import { BarChart3 } from 'lucide-react-native';

import { EmptyState, ErrorBanner } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { SegmentedControl } from '@/features/preparation/components/SegmentedControl';
import { formatInteger } from '@/lib/format';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { HubPricingSelectionStatsMonths } from '@/types/hubPricing';

import { SheetScreen } from '../components/SheetScreen';
import { usePricingState } from '../filtersStore';
import { useSelectionStats } from '../hooks/useSelectionStats';
import { GeographyTab, MonthlyTab, OverviewTab, ProductsTab, SiteTab } from './tabs';

type TabKey = 'overview' | 'geo' | 'products' | 'site' | 'monthly';

const MONTH_OPTIONS: HubPricingSelectionStatsMonths[] = [3, 6, 12];

/**
 * « Stats sélection » : ventes de la sélection filtrée sur 3, 6 ou 12 mois, face à la période
 * précédente. Mêmes onglets que le tiroir du web ; la géographie est une liste (pas de carte).
 */
export function StatsSheet() {
  const styles = useStyles();
  const t = useTheme();
  const { filters } = usePricingState();
  const [months, setMonths] = useState<HubPricingSelectionStatsMonths>(6);
  const [tab, setTab] = useState<TabKey>('overview');
  const [showMargin, setShowMargin] = useState(false);

  const data = useSelectionStats(filters, months, true);
  const { refreshing, onRefresh } = usePullToRefresh(data.refetch);
  const hasSite = !!data.insights?.site;
  // L'onglet Site n'existe que si le back renvoie l'analyse du site.
  const activeTab: TabKey = tab === 'site' && !hasSite ? 'overview' : tab;

  const segments = [
    { key: 'overview' as const, label: 'Vue' },
    { key: 'geo' as const, label: 'Pays' },
    { key: 'products' as const, label: 'Produits' },
    ...(hasSite ? [{ key: 'site' as const, label: 'Site' }] : []),
    { key: 'monthly' as const, label: 'Mensuel' },
  ];

  const { stats, insights } = data;

  return (
    <SheetScreen title="Stats sélection" scroll={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={t.accentText}
          />
        }
      >
        <SegmentedControl
          segments={MONTH_OPTIONS.map((value) => ({ key: String(value), label: `${value} mois` }))}
          value={String(months)}
          onChange={(key) => setMonths(Number(key) as HubPricingSelectionStatsMonths)}
        />
        <SegmentedControl segments={segments} value={activeTab} onChange={setTab} />

        <View style={styles.marginRow}>
          <Text style={styles.marginLabel}>Afficher la marge et les achats</Text>
          <Switch
            value={showMargin}
            onValueChange={setShowMargin}
            trackColor={{ true: t.accent }}
            accessibilityLabel="Afficher la marge et les achats"
          />
        </View>

        {stats ? (
          <Text style={styles.count}>
            {formatInteger(stats.productCount)} référence{stats.productCount > 1 ? 's' : ''} dans la
            sélection
          </Text>
        ) : null}

        {data.statsLoading && !stats ? (
          <ActivityIndicator color={t.accentText} style={styles.loader} />
        ) : data.statsError && !stats ? (
          <ErrorBanner
            error={data.statsError}
            fallback="Impossible de charger les statistiques"
            onRetry={() => void onRefresh()}
          />
        ) : !stats || stats.productCount === 0 ? (
          <EmptyState
            icon={<BarChart3 size={24} color={t.textMuted} />}
            title="Aucune donnée"
            text="La sélection ne contient aucun produit."
          />
        ) : (
          <>
            {activeTab === 'overview' ? (
              <OverviewTab stats={stats} insights={insights} showMargin={showMargin} />
            ) : null}
            {activeTab === 'monthly' ? (
              <MonthlyTab series={stats.series} showMargin={showMargin} />
            ) : null}
            {activeTab === 'geo' || activeTab === 'products' || activeTab === 'site' ? (
              insights ? (
                activeTab === 'geo' ? (
                  <GeographyTab insights={insights} />
                ) : activeTab === 'products' ? (
                  <ProductsTab insights={insights} />
                ) : insights.site ? (
                  <SiteTab site={insights.site} />
                ) : null
              ) : data.insightsError ? (
                <ErrorBanner
                  error={data.insightsError}
                  fallback="Impossible de charger les analyses"
                  onRetry={() => void onRefresh()}
                />
              ) : (
                <ActivityIndicator color={t.accentText} style={styles.loader} />
              )
            ) : null}
          </>
        )}
      </ScrollView>
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing['4xl'] },
  loader: { paddingVertical: spacing['4xl'] },
  marginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  marginLabel: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  count: { fontSize: fontSize.xs, color: t.textSubtle },
}));
