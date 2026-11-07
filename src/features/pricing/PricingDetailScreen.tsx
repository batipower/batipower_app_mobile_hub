import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Copy, ExternalLink, Package, PackageX, Pencil } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubPricing } from '@/auth/permissions';
import { Badge, DetailSection, Divider, InfoRow } from '@/components/ui';
import { thumbnailUri } from '@/features/products/productDisplay';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { copyToClipboard } from '@/lib/clipboard';
import { formatDateTime, formatEuro, formatInteger, formatPercent } from '@/lib/format';
import { openExternalUrl } from '@/lib/openWeb';
import {
  fontSize,
  makeStyles,
  monoFontFamily,
  radius,
  spacing,
  useTheme,
  withAlpha,
} from '@/theme';
import type { HubPricingRow, PricingMarketplaceKey } from '@/types/hubPricing';

import { usePricingState } from './filtersStore';
import { usePricingRow } from './hooks/usePricingRow';
import { useUpdatePricingRow } from './hooks/useUpdatePricingRow';
import { openPricingEdit, openPricingPicker, type PricingEditField } from './navigation';
import {
  COUNTRY_FLAGS,
  MARKETPLACE_LABELS,
  RETURN_TYPE_LABELS,
  visibleMarketplaces,
  warehouseLabel,
} from './options';
import {
  buyboxMargin,
  isManoMonitoredForCountry,
  isMonitoredForCountry,
  parseNumericActual,
  resolveCarrierCostHT,
  returnsSeries,
  salesSeries,
  toggleManoMonitorPayload,
  toggleMonitorPayload,
  websiteMargin,
  type MonthPoint,
} from './rowMetrics';

/** Champ éditable de chaque marketplace (Cdiscount n'a pas de prix cible éditable). */
const TARGET_FIELD: Partial<Record<PricingMarketplaceKey, PricingEditField>> = {
  amazon: 'targetPriceAmazon',
  manoMano: 'targetPriceManoMano',
  leroyMerlin: 'targetPriceLeroyMerlin',
  castorama: 'targetPriceCastorama',
  bricoman: 'targetPriceBricoman',
};

/** Fiche d'une ligne Pricing, réservée au SUPERADMIN, avec l'édition légère. */
export function PricingDetailScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canAccessHubPricing(user.role) ? (
    <PricingDetail />
  ) : (
    <AccessDenied
      title="Accès réservé"
      text="La page Pricing est réservée aux comptes Super Admin."
    />
  );
}

function PricingDetail() {
  const styles = useStyles();
  const t = useTheme();
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const { country } = usePricingState();
  const { row, loading, notFound, error, refetch } = usePricingRow(reference);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  return (
    <>
      <Stack.Screen options={{ title: reference ?? 'Ligne pricing' }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={t.accentText}
          />
        }
      >
        {loading ? <ListSkeleton rows={3} height={150} /> : null}
        {error && !row ? (
          <ErrorBanner
            error={error}
            fallback="Impossible de charger la ligne"
            onRetry={() => void onRefresh()}
          />
        ) : null}
        {notFound ? (
          <EmptyState
            icon={<PackageX size={24} color={t.textMuted} />}
            title="Produit introuvable"
            text="Cette référence n'est plus dans le catalogue Pricing."
          />
        ) : null}
        {row ? <PricingDetailBody row={row} country={country} /> : null}
      </ScrollView>
    </>
  );
}

function EditableRow({
  label,
  value,
  reference,
  field,
}: {
  label: string;
  value: string;
  reference: string;
  field: PricingEditField;
}) {
  return (
    <InfoRow
      label={label}
      value={value}
      icon={Pencil}
      actionHint="Modifier la valeur"
      onPress={() => openPricingEdit(reference, field)}
    />
  );
}

function SwitchRow({
  label,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: t.accent }}
        accessibilityLabel={label}
      />
    </View>
  );
}

function SeriesBars({ title, points }: { title: string; points: MonthPoint[] }) {
  const styles = useStyles();
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <View style={styles.series}>
      <Text style={styles.seriesTitle}>{title}</Text>
      <View style={styles.bars}>
        {points.map((point) => (
          <View key={point.key} style={styles.barCol}>
            <Text style={styles.barValue}>{formatInteger(point.value)}</Text>
            <View style={styles.barTrack}>
              <View
                style={[styles.barFill, { height: `${Math.max(4, (point.value / max) * 100)}%` }]}
              />
            </View>
            <Text style={styles.barLabel} numberOfLines={1}>
              {point.label.slice(0, 3)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PricingDetailBody({ row, country }: { row: HubPricingRow; country: string }) {
  const styles = useStyles();
  const t = useTheme();
  const update = useUpdatePricingRow();
  const uri = thumbnailUri(row.thumbnailBase64);
  const margin = websiteMargin(row, country);
  const carrier = resolveCarrierCostHT(row.transport.costCarrierHT, country);
  const monitored = isMonitoredForCountry(row, country);
  const manoMonitored = isManoMonitoredForCountry(row, country);
  const sales = salesSeries(row, country);
  const salesAll = salesSeries(row);
  const returns = returnsSeries(row);
  const returnsTotal = returns.reduce((sum, point) => sum + point.value, 0);
  const soldTotal = salesAll.reduce((sum, point) => sum + point.value, 0);
  const returnRate = soldTotal > 0 ? (returnsTotal / soldTotal) * 100 : null;
  const byType = row.returns?.byType ?? {};
  const markets = visibleMarketplaces(country);
  const patch = (payload: Parameters<typeof update.mutate>[0]['payload']) =>
    update.mutate({ reference: row.reference, payload });

  return (
    <>
      <DetailSection title="Produit">
        <View style={styles.identity}>
          <View style={styles.thumbnail} accessibilityElementsHidden importantForAccessibility="no">
            {uri ? (
              <Image
                source={{ uri }}
                contentFit="contain"
                style={styles.image}
                recyclingKey={row.reference}
              />
            ) : (
              <Package size={28} color={t.textFaint} />
            )}
          </View>
          <View style={styles.identityBody}>
            <Pressable
              onPress={() => void copyToClipboard(row.reference, 'Référence')}
              accessibilityRole="button"
              accessibilityLabel={`Référence ${row.reference}`}
              accessibilityHint="Appuyer pour copier"
              hitSlop={12}
              style={styles.referenceRow}
            >
              <Text style={styles.reference}>{row.reference}</Text>
              <Copy size={14} color={t.textSubtle} />
            </Pressable>
            <Text style={styles.designation}>{row.designation?.trim() || 'Sans désignation'}</Text>
            {row.brand ? <Text style={styles.brand}>{row.brand}</Text> : null}
          </View>
        </View>
        <View style={styles.badges}>
          {row.obsoletProduct ? <Badge label="Obsolète" tone="red" /> : null}
          {!row.isActive ? <Badge label="Inactif" tone="red" /> : null}
          {row.websiteActive === false ? <Badge label="Hors site" tone="amber" /> : null}
          {row.tooFragile ? <Badge label="Fragile" tone="amber" /> : null}
          {row.tooVoluminous ? <Badge label="Volumineux" tone="amber" /> : null}
          {row.hasActiveSupplierOrder ? <Badge label="Cde fournisseur" tone="blue" /> : null}
          {row.hasGoogleMerchant ? <Badge label="Google Merchant" tone="green" /> : null}
          {row.siteQuality ? (
            <Badge
              label={`Note ${row.siteQuality.grade} · ${row.siteQuality.score}`}
              tone={
                row.siteQuality.grade === 'D'
                  ? 'red'
                  : row.siteQuality.grade === 'C'
                    ? 'amber'
                    : 'green'
              }
            />
          ) : null}
        </View>
        <Divider />
        <SwitchRow
          label="Favori"
          value={row.favorite}
          disabled={update.isPending}
          onValueChange={(favorite) => patch({ favorite })}
        />
        <SwitchRow
          label={`Surveillance BuyBox Amazon ${COUNTRY_FLAGS[country] ?? ''} ${country}`}
          value={monitored}
          disabled={update.isPending}
          onValueChange={() => patch(toggleMonitorPayload(row, country))}
        />
        {country === 'ES' || country === 'IT' ? (
          <SwitchRow
            label={`Surveillance BuyBox ManoMano ${COUNTRY_FLAGS[country] ?? ''} ${country}`}
            value={manoMonitored}
            disabled={update.isPending}
            onValueChange={() => patch(toggleManoMonitorPayload(row, country))}
          />
        ) : null}
        <Divider />
        <View style={styles.tagsHeader}>
          <Text style={styles.switchLabel}>Tags</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Modifier les tags"
            hitSlop={10}
            onPress={() => openPricingPicker('edit-tags', row.reference)}
          >
            <Text style={styles.edit}>Modifier</Text>
          </Pressable>
        </View>
        <View style={styles.badges}>
          {row.productTags.length === 0 ? (
            <Text style={styles.muted}>Aucun tag</Text>
          ) : (
            row.productTags.map((tag) => <Badge key={tag} label={tag} tone="purple" />)
          )}
        </View>
      </DetailSection>

      <DetailSection title="Prix et potentiel">
        <EditableRow
          label="Prix d'achat HT"
          value={formatEuro(row.fixPriceHT)}
          reference={row.reference}
          field="fixPriceHT"
        />
        <EditableRow
          label="Potentiel / mois"
          value={
            row.potential.previSalesByMonth != null
              ? formatInteger(row.potential.previSalesByMonth)
              : '—'
          }
          reference={row.reference}
          field="previSalesByMonth"
        />
        <InfoRow label="Prix site TTC" value={formatEuro(row.website.priceTTC)} />
        {margin ? (
          <InfoRow
            label="Marge site"
            value={`${formatEuro(margin.marginEur)} (${formatPercent(margin.marginPercent)})`}
          />
        ) : null}
        <InfoRow label="Transport HT" value={formatEuro(carrier)} />
        <InfoRow
          label="Poids"
          value={
            row.transport.weightInGrams != null
              ? `${formatInteger(row.transport.weightInGrams)} g`
              : '—'
          }
        />
        <InfoRow label="Achat Flevy HT" value={formatEuro(row.purchase.flevyHT)} />
        <InfoRow label="Achat Dombasle HT" value={formatEuro(row.purchase.dombasleHT)} />
      </DetailSection>

      <DetailSection title="Stock">
        <InfoRow
          label="Flevy"
          value={`${formatInteger(row.stock.flevy)}${row.stock.depreciatedFlevy ? ' · déprécié' : ''}${row.stock.multipleFlevy > 1 ? ` · lot de ${row.stock.multipleFlevy}` : ''}`}
        />
        <InfoRow
          label="Dombasle"
          value={`${formatInteger(row.stock.dombasle)}${row.stock.depreciatedDombasle ? ' · déprécié' : ''}${row.stock.multipleDombasle > 1 ? ` · lot de ${row.stock.multipleDombasle}` : ''}`}
        />
        <InfoRow label="QG Batipower" value={formatInteger(row.stock.qg ?? 0)} />
        <InfoRow label="Affectation" value={warehouseLabel(row.defaultAffectation)} />
      </DetailSection>

      <DetailSection title={`Marketplaces · ${COUNTRY_FLAGS[country] ?? ''} ${country}`}>
        {markets.map((key, index) => {
          const mp = row.marketplaces[key];
          const actual = parseNumericActual(mp.actual);
          const status =
            mp.isOwner === true
              ? 'BuyBox gagnée'
              : mp.isOwner === false
                ? 'BuyBox perdue'
                : 'BuyBox inconnue';
          const mpMargin =
            mp.isOwner === true && actual != null ? buyboxMargin(row, key, actual, country) : null;
          const field = TARGET_FIELD[key];
          return (
            <View key={key} style={styles.market}>
              {index > 0 ? <Divider /> : null}
              <View style={styles.marketHeader}>
                <Text style={styles.marketName}>{MARKETPLACE_LABELS[key].label}</Text>
                {mp.notAvailable ? <Badge label="Indisponible" tone="neutral" /> : null}
                {!mp.hasSku ? (
                  <Badge
                    label={mp.creationRequested ? 'Création demandée' : 'Sans SKU'}
                    tone="amber"
                  />
                ) : null}
                {mp.productUrl ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Ouvrir la page ${MARKETPLACE_LABELS[key].label}`}
                    hitSlop={10}
                    onPress={() => void openExternalUrl(mp.productUrl!)}
                    style={styles.marketLink}
                  >
                    <ExternalLink size={16} color={t.accentText} />
                  </Pressable>
                ) : null}
              </View>
              <InfoRow
                label="BuyBox"
                value={actual != null ? `${formatEuro(actual)} · ${status}` : status}
              />
              {mpMargin ? (
                <InfoRow
                  label="Marge BuyBox"
                  value={`${formatEuro(mpMargin.marginEur)} (${formatPercent(mpMargin.marginPercent)})`}
                />
              ) : null}
              {field ? (
                <EditableRow
                  label="Prix cible TTC"
                  value={formatEuro(mp.targetPrice)}
                  reference={row.reference}
                  field={field}
                />
              ) : (
                <InfoRow label="Prix cible TTC" value={formatEuro(mp.targetPrice)} />
              )}
              <InfoRow label="Prix d'équilibre" value={formatEuro(mp.equilibriumPrice)} />
              {mp.rentabilityRate != null ? (
                <InfoRow label="Commission" value={formatPercent(mp.rentabilityRate)} />
              ) : null}
            </View>
          );
        })}
      </DetailSection>

      <DetailSection title="Ventes et retours">
        <SeriesBars title={`Ventes ${country} (7 mois)`} points={sales} />
        <SeriesBars title="Ventes tous pays (7 mois)" points={salesAll} />
        <Divider />
        <SeriesBars title="Retours (7 mois)" points={returns} />
        <InfoRow
          label="Taux de retour"
          value={
            returnRate != null
              ? `${formatPercent(returnRate)} (${returnsTotal} / ${soldTotal})`
              : '—'
          }
        />
        {Object.entries(byType)
          .filter(([, count]) => (count ?? 0) > 0)
          .map(([type, count]) => (
            <InfoRow
              key={type}
              label={RETURN_TYPE_LABELS[type as keyof typeof RETURN_TYPE_LABELS] ?? type}
              value={formatInteger(count)}
            />
          ))}
      </DetailSection>

      <DetailSection title="Informations">
        <InfoRow label="EAN" value={row.ean ?? '—'} mono copyLabel="EAN" />
        <InfoRow label="Catégorie" value={row.categoryType ?? '—'} />
        <InfoRow label="Code Flevy" value={row.codeFlevy ?? '—'} mono />
        <InfoRow label="Code Dombasle" value={row.codeDombasle ?? '—'} mono />
        <InfoRow label="Calculé le" value={formatDateTime(row.lastCalculated) ?? '—'} />
        <InfoRow label="Mis à jour le" value={formatDateTime(row.updatedAt) ?? '—'} />
        <InfoRow
          label="Fiche produit"
          value="Ouvrir"
          icon={ExternalLink}
          onPress={() =>
            router.push({
              pathname: '/hub/recherche/produit/[reference]',
              params: { reference: row.reference },
            })
          }
        />
      </DetailSection>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  scroll: { flex: 1, backgroundColor: t.bg },
  content: { padding: spacing.xl, gap: spacing['2xl'], paddingBottom: spacing['4xl'] },
  identity: { flexDirection: 'row', gap: spacing.lg },
  thumbnail: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: t.surface,
  },
  image: { width: '100%', height: '100%' },
  identityBody: { flex: 1, gap: spacing.xs },
  referenceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reference: {
    fontFamily: monoFontFamily,
    fontSize: fontSize.base,
    fontWeight: '700',
    color: t.text,
  },
  designation: { fontSize: fontSize.sm, color: t.text },
  brand: { fontSize: fontSize.xs, fontWeight: '600', color: t.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  muted: { fontSize: fontSize.sm, color: t.textSubtle },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchLabel: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  tagsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  edit: { fontSize: fontSize.sm, fontWeight: '700', color: t.accentText },
  market: { gap: spacing.md },
  marketHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  marketName: { fontSize: fontSize.base, fontWeight: '700', color: t.text, flexShrink: 1 },
  marketLink: { marginLeft: 'auto' },
  series: { gap: spacing.sm },
  seriesTitle: { fontSize: fontSize.xs, fontWeight: '700', color: t.textMuted },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs + 2, height: 92 },
  barCol: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  barValue: { fontSize: 10, fontWeight: '700', color: t.textMuted },
  barTrack: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-end',
    borderRadius: radius.sm - 4,
    backgroundColor: withAlpha(t.accent, 0.08),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.border,
    overflow: 'hidden',
  },
  barFill: { width: '100%', backgroundColor: t.accent },
  barLabel: { fontSize: 10, color: t.textSubtle },
}));
