import { View } from 'react-native';

import {
  formatCompactEuro,
  formatEuro,
  formatEuroWhole,
  formatInteger,
  formatPercent,
} from '@/lib/format';
import { spacing } from '@/theme';
import type {
  HubPricingSelectionInsights,
  HubPricingSelectionStats,
  HubPricingSelectionStatsPoint,
  HubPricingSiteInsights,
} from '@/types/hubPricing';

import {
  BarRow,
  Delta,
  EmptyNote,
  KpiCard,
  MetricLine,
  StatsCard,
  deriveTotals,
  ratioOf,
} from './parts';

const KPI_GRID = { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md } as const;

function currentOf<T extends { period: 'current' | 'previous' }>(series: T[]) {
  return series.filter((point) => point.period === 'current');
}

function previousOf<T extends { period: 'current' | 'previous' }>(series: T[]) {
  return series.filter((point) => point.period === 'previous');
}

/** Vue d'ensemble : KPI, évolution mensuelle du CA, achats par entrepôt, répartition par canal. */
export function OverviewTab({
  stats,
  insights,
  showMargin,
}: {
  stats: HubPricingSelectionStats;
  insights: HubPricingSelectionInsights | undefined;
  showMargin: boolean;
}) {
  const cur = deriveTotals(stats.current);
  const prev = deriveTotals(stats.previous);
  const currentRows = currentOf(stats.series);
  const previousRows = previousOf(stats.series);
  const maxCa = Math.max(1, ...currentRows.map((r) => r.caHT), ...previousRows.map((r) => r.caHT));
  const channelTotal = insights?.byChannel.reduce((sum, channel) => sum + channel.caHT, 0) ?? 0;

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={KPI_GRID}>
        <KpiCard
          tone="hero"
          label="CA HT"
          value={formatEuroWhole(cur.caHT)}
          delta={<Delta current={cur.caHT} previous={prev.caHT} />}
          previousLabel={`N-1 ${formatEuroWhole(prev.caHT)}`}
        />
        {showMargin ? (
          <KpiCard
            label="Marge brute estimée"
            value={cur.marginHT != null ? formatEuroWhole(cur.marginHT) : 'n/a'}
            delta={
              cur.marginHT != null && prev.marginHT != null ? (
                <Delta current={cur.marginHT} previous={prev.marginHT} />
              ) : undefined
            }
            previousLabel={
              cur.marginRate != null ? `Taux ${formatPercent(cur.marginRate)}` : undefined
            }
            hint="CA HT − achats HT"
          />
        ) : null}
        <KpiCard
          label="Volume (pièces)"
          value={formatInteger(cur.quantity)}
          delta={<Delta current={cur.quantity} previous={prev.quantity} />}
          previousLabel={`N-1 ${formatInteger(prev.quantity)}`}
        />
        <KpiCard
          label="Commandes"
          value={formatInteger(cur.orders)}
          delta={<Delta current={cur.orders} previous={prev.orders} />}
          previousLabel={`N-1 ${formatInteger(prev.orders)}`}
        />
        <KpiCard
          label="Panier moyen HT"
          value={cur.basketHT != null ? formatEuro(cur.basketHT) : 'n/a'}
          delta={
            cur.basketHT != null && prev.basketHT != null ? (
              <Delta current={cur.basketHT} previous={prev.basketHT} />
            ) : undefined
          }
          previousLabel={prev.basketHT != null ? `N-1 ${formatEuro(prev.basketHT)}` : undefined}
        />
      </View>

      <StatsCard title="Évolution du CA HT" subtitle="Par mois, avec la variation face à N-1">
        {currentRows.length === 0 ? (
          <EmptyNote text="Aucune donnée" />
        ) : (
          currentRows.map((row, index) => (
            <BarRow
              key={row.key}
              label={row.label}
              value={formatCompactEuro(row.caHT)}
              ratio={ratioOf(row.caHT, maxCa)}
              trailing={<Delta current={row.caHT} previous={previousRows[index]?.caHT ?? 0} />}
              sublabel={`${formatInteger(row.quantity)} pièces · ${formatInteger(row.orders)} commandes`}
            />
          ))
        )}
      </StatsCard>

      {showMargin ? (
        <StatsCard
          title="Achats par entrepôt"
          subtitle="Coût d'achat HT des ventes (quantités × prix d'achat de l'entrepôt d'origine)"
        >
          <MetricLine label="Dombasle" value={formatEuroWhole(stats.current.purchasesDombasleHT)} />
          <MetricLine label="Flevy" value={formatEuroWhole(stats.current.purchasesFlevyHT)} />
          <MetricLine
            label="Total achats HT"
            value={formatEuroWhole(stats.current.purchasesHT)}
            emphasis
          />
          {stats.purchasesUnpricedQuantity > 0 ? (
            <EmptyNote
              text={`${formatInteger(stats.purchasesUnpricedQuantity)} pièce(s) sans prix d'achat connu exclue(s).`}
            />
          ) : null}
        </StatsCard>
      ) : null}

      <StatsCard title="Répartition par canal" subtitle="Part du CA HT par origine de commande">
        {!insights || insights.byChannel.length === 0 ? (
          <EmptyNote text={insights ? 'Aucune donnée' : 'Chargement…'} />
        ) : (
          insights.byChannel.map((channel) => (
            <BarRow
              key={channel.code}
              label={channel.name}
              value={formatCompactEuro(channel.caHT)}
              ratio={ratioOf(channel.caHT, channelTotal)}
              trailing={<Delta current={channel.caHT} previous={channel.previousCaHT} />}
              sublabel={`${formatPercent(ratioOf(channel.caHT, channelTotal) * 100, 0)} du CA`}
            />
          ))
        )}
      </StatsCard>
    </View>
  );
}

/** Géographie : CA par pays de livraison (liste, sans carte) et par canal. */
export function GeographyTab({ insights }: { insights: HubPricingSelectionInsights }) {
  const total = insights.byCountry.reduce((sum, country) => sum + country.caHT, 0);

  return (
    <View style={{ gap: spacing.lg }}>
      <StatsCard title="CA par pays" subtitle="Pays de livraison des commandes">
        {insights.byCountry.length === 0 ? (
          <EmptyNote text="Aucune donnée" />
        ) : (
          insights.byCountry.map((country) => (
            <BarRow
              key={country.code}
              label={country.name}
              value={formatCompactEuro(country.caHT)}
              ratio={ratioOf(country.caHT, total)}
              trailing={<Delta current={country.caHT} previous={country.previousCaHT} />}
              sublabel={`${formatPercent(ratioOf(country.caHT, total) * 100, 0)} du CA · ${formatInteger(country.quantity)} pièces · ${formatInteger(country.orders)} commandes`}
            />
          ))
        )}
        {insights.ordersWithoutCountry > 0 ? (
          <EmptyNote
            text={`${formatInteger(insights.ordersWithoutCountry)} commande(s) sans pays de livraison.`}
          />
        ) : null}
      </StatsCard>
    </View>
  );
}

/** Produits et marques : les tops en CA HT de la sélection. */
export function ProductsTab({ insights }: { insights: HubPricingSelectionInsights }) {
  const maxProduct = Math.max(1, ...insights.topProducts.map((p) => p.caHT));
  const maxBrand = Math.max(1, ...insights.topBrands.map((b) => b.caHT));

  return (
    <View style={{ gap: spacing.lg }}>
      <StatsCard title="Top produits" subtitle="Classés par CA HT">
        {insights.topProducts.length === 0 ? (
          <EmptyNote text="Aucune donnée" />
        ) : (
          insights.topProducts.map((product) => (
            <BarRow
              key={product.reference}
              label={product.reference}
              value={formatCompactEuro(product.caHT)}
              ratio={ratioOf(product.caHT, maxProduct)}
              trailing={<Delta current={product.caHT} previous={product.previousCaHT} />}
              sublabel={[
                product.brand,
                product.designation,
                `${formatInteger(product.quantity)} pièces`,
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          ))
        )}
      </StatsCard>

      <StatsCard title="Top marques" subtitle="Classées par CA HT">
        {insights.topBrands.length === 0 ? (
          <EmptyNote text="Aucune donnée" />
        ) : (
          insights.topBrands.map((brand) => (
            <BarRow
              key={brand.brand}
              label={brand.brand}
              value={formatCompactEuro(brand.caHT)}
              ratio={ratioOf(brand.caHT, maxBrand)}
              trailing={<Delta current={brand.caHT} previous={brand.previousCaHT} />}
              sublabel={`${formatInteger(brand.quantity)} pièces · ${formatInteger(brand.orders)} commandes`}
            />
          ))
        )}
      </StatsCard>
    </View>
  );
}

/** Site Batipower : ventes des commandes d'origine WEBSITE. */
export function SiteTab({ site }: { site: HubPricingSiteInsights }) {
  const currentRows = currentOf(site.monthly);
  const previousRows = previousOf(site.monthly);
  const maxCa = Math.max(1, ...currentRows.map((r) => r.caHT), ...previousRows.map((r) => r.caHT));
  const countryTotal = site.byCountry.reduce((sum, country) => sum + country.caHT, 0);
  const maxProduct = Math.max(1, ...site.topProducts.map((p) => p.caHT));

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={KPI_GRID}>
        <KpiCard
          tone="hero"
          label="CA HT du site"
          value={formatEuroWhole(site.summary.caHT)}
          delta={<Delta current={site.summary.caHT} previous={site.summary.previousCaHT} />}
          previousLabel={`N-1 ${formatEuroWhole(site.summary.previousCaHT)}`}
        />
        <KpiCard
          label="Volume (pièces)"
          value={formatInteger(site.summary.quantity)}
          delta={<Delta current={site.summary.quantity} previous={site.summary.previousQuantity} />}
        />
        <KpiCard
          label="Commandes"
          value={formatInteger(site.summary.orders)}
          delta={<Delta current={site.summary.orders} previous={site.summary.previousOrders} />}
        />
      </View>

      <StatsCard title="CA HT mensuel du site">
        {currentRows.length === 0 ? (
          <EmptyNote text="Aucune donnée" />
        ) : (
          currentRows.map((row, index) => (
            <BarRow
              key={row.key}
              label={row.label}
              value={formatCompactEuro(row.caHT)}
              ratio={ratioOf(row.caHT, maxCa)}
              trailing={<Delta current={row.caHT} previous={previousRows[index]?.caHT ?? 0} />}
              sublabel={`${formatInteger(row.quantity)} pièces · ${formatInteger(row.orders)} commandes`}
            />
          ))
        )}
      </StatsCard>

      <StatsCard title="Par pays">
        {site.byCountry.length === 0 ? (
          <EmptyNote text="Aucune donnée" />
        ) : (
          site.byCountry.map((country) => (
            <BarRow
              key={country.code}
              label={country.name}
              value={formatCompactEuro(country.caHT)}
              ratio={ratioOf(country.caHT, countryTotal)}
              trailing={<Delta current={country.caHT} previous={country.previousCaHT} />}
            />
          ))
        )}
      </StatsCard>

      <StatsCard title="Top produits du site">
        {site.topProducts.length === 0 ? (
          <EmptyNote text="Aucune donnée" />
        ) : (
          site.topProducts.map((product) => (
            <BarRow
              key={product.reference}
              label={product.reference}
              value={formatCompactEuro(product.caHT)}
              ratio={ratioOf(product.caHT, maxProduct)}
              trailing={<Delta current={product.caHT} previous={product.previousCaHT} />}
              sublabel={[product.brand, product.designation].filter(Boolean).join(' · ')}
            />
          ))
        )}
      </StatsCard>
    </View>
  );
}

function MonthTable({
  title,
  rows,
  showMargin,
}: {
  title: string;
  rows: HubPricingSelectionStatsPoint[];
  showMargin: boolean;
}) {
  const sum = (pick: (row: HubPricingSelectionStatsPoint) => number) =>
    rows.reduce((acc, row) => acc + pick(row), 0);

  return (
    <StatsCard title={title}>
      {rows.map((row) => (
        <View key={row.key} style={{ gap: 2 }}>
          <MetricLine label={row.label} value={formatEuro(row.caHT)} emphasis />
          <MetricLine
            label="Volume · commandes"
            value={`${formatInteger(row.quantity)} · ${formatInteger(row.orders)}`}
          />
          {showMargin ? (
            <MetricLine
              label="Achats Dombasle · Flevy"
              value={`${formatEuro(row.purchasesDombasleHT)} · ${formatEuro(row.purchasesFlevyHT)}`}
            />
          ) : null}
        </View>
      ))}
      <MetricLine label="Total CA HT" value={formatEuro(sum((r) => r.caHT))} emphasis />
      <MetricLine
        label="Total volume · commandes"
        value={`${formatInteger(sum((r) => r.quantity))} · ${formatInteger(sum((r) => r.orders))}`}
      />
    </StatsCard>
  );
}

/** Détail mensuel de la période courante et de la période précédente (N-1). */
export function MonthlyTab({
  series,
  showMargin,
}: {
  series: HubPricingSelectionStatsPoint[];
  showMargin: boolean;
}) {
  return (
    <View style={{ gap: spacing.lg }}>
      <MonthTable title="Période courante" rows={currentOf(series)} showMargin={showMargin} />
      <MonthTable
        title="Période précédente (N-1)"
        rows={previousOf(series)}
        showMargin={showMargin}
      />
    </View>
  );
}
