import { Linking, Pressable, Text, View } from 'react-native';
import { ExternalLink, Pencil, RefreshCw } from 'lucide-react-native';

import { formatEuro, formatInteger, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, radius, spacing, useTheme, withAlpha } from '@/theme';
import type {
  BuyBoxMarketplace,
  MarketplaceData,
  MarketplaceViabilityEntry,
  MarketplaceViabilityResult,
  NegotiationRequest,
  StagingItem,
  WeightSource,
} from '@/types/hubProductAnalyzer';

import { useDistributors } from '../../hooks/useDistributors';
import {
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  WS_CFG,
  getCastoramaUrl,
  getLeroyMerlinUrl,
  getManomanoUrl,
} from '../../lib/constants';
import { canEditRequestPrice, groupByWarehouse, requestLabel, summarizeRequests } from '../../lib/nego-requests';
import { num, snapshotOf, str } from '../../lib/snapshot';
import { buildSupplierRows } from '../../lib/supplier-rows';
import { openPaEdit } from '../../navigation';
import { StockBadge } from '../StockBadge';
import { Fact, FactGrid, FicheSection, SectionHint } from './FicheSection';

const Mini = ({ label, color }: { label: string; color: string }) => {
  const styles = useStyles();
  return (
    <View style={[styles.mini, { backgroundColor: withAlpha(color, 0.14) }]}>
      <Text style={[styles.miniText, { color }]}>{label}</Text>
    </View>
  );
};

// ─── Données EbatPro / Transport / Amazon ────────────────────────────────────

export function ProductSections({ item, editable }: { item: StagingItem; editable: boolean }) {
  const t = useTheme();
  const { eb, az, tr } = snapshotOf(item);
  const ean = str(eb?.ean) ?? item.ean;
  const canEditEan = editable && item.status !== 'LAUNCHED';
  const edit = (kind: 'ean' | 'brand' | 'weight', extra: Record<string, string> = {}) =>
    openPaEdit(kind, { uuid: item.uuid, ...extra });

  const weight = num(eb?.weightGrams) ?? item.weightGrams;
  const shipped = num(tr?.weightUsed);
  const mainOffer = (item.distributorOffers ?? []).find((o) => o.warehouse === item.warehouse);
  const legacy =
    item.warehouse === 'FLEVY'
      ? (item.conditioningMultiplierFlevy ??
        (item.salesPackagingFlevy != null && item.salesPackagingFlevy > 1 ? Math.round(item.salesPackagingFlevy) : 1))
      : (item.conditioningMultiplierDombasle ??
        (item.salesPackagingDombasle != null && item.salesPackagingDombasle > 1
          ? Math.round(item.salesPackagingDombasle)
          : 1));
  const mult =
    mainOffer?.conditioningMultiplier && mainOffer.conditioningMultiplier > 1 ? mainOffer.conditioningMultiplier : legacy;
  const source = (str(tr?.weightSource) ?? item.weightSource) as WeightSource | null;
  const sourceCfg = source ? WS_CFG[source] ?? WS_CFG.unknown : null;
  const amazonLink = str(az?.amazonLink);

  return (
    <>
      <FicheSection title="Données EbatPro" dot="#94C83D">
        <FactGrid>
          <Fact
            label="EAN"
            value={ean ?? 'Non résolu ⚠'}
            mono
            tone={ean ? undefined : t.danger}
            onEdit={canEditEan ? () => edit('ean', ean ? { ean, mode: 'edit' } : { mode: 'attach' }) : undefined}
            editLabel={ean ? "Modifier l'EAN" : "Renseigner l'EAN"}
          />
          <Fact
            label="Marque"
            value={str(eb?.brand) ?? item.brand}
            onEdit={editable ? () => edit('brand') : undefined}
          />
          <Fact label="SKU fab." value={str(eb?.manufacturerSku) ?? item.manufacturerSku} mono />
          <Fact
            label="Poids"
            value={weight ? `${formatInteger(weight)} g` : item.weightPending ? 'À renseigner' : null}
            onEdit={editable ? () => edit('weight') : undefined}
          />
          <Fact label="Prix achat" tag="HT" value={num(eb?.purchasePriceHT) != null ? formatEuro(num(eb?.purchasePriceHT)) : null} />
          <Fact
            label="Prix public"
            tag="HT"
            value={(num(eb?.publicPriceHT) ?? item.publicPriceHT) != null ? formatEuro(num(eb?.publicPriceHT) ?? item.publicPriceHT) : null}
          />
          <Fact label="Unité vente" value={str(eb?.saleUnit) ?? item.saleUnit} />
          <Fact label="Conditionnement" value={`×${mult}`} tone={mult > 1 ? t.info : undefined} />
        </FactGrid>
        <SectionHint text="Le conditionnement par fournisseur est détaillé dans la section « Fournisseurs »." />
      </FicheSection>

      <FicheSection title="Transport" dot="#8B5CF6" defaultOpen={false}>
        <FactGrid>
          <Fact label="Coût" tag="HT" value={num(tr?.costHT) != null ? formatEuro(num(tr?.costHT)) : null} accent />
          <Fact label="Transporteur" value={str(tr?.carrierUsed)} />
          <Fact
            label="Poids expédié"
            value={shipped ? `${formatInteger(shipped)} g` : null}
            onEdit={editable ? () => edit('weight') : undefined}
          />
          {sourceCfg ? (
            <Fact label="Source du poids" value={sourceCfg.label} tone={sourceCfg.color} />
          ) : null}
        </FactGrid>
      </FicheSection>

      <FicheSection
        title="Amazon"
        subtitle={str(az?.title) ?? undefined}
        dot="#3B82F6"
        defaultOpen={false}
        right={
          amazonLink ? (
            <Pressable
              hitSlop={10}
              accessibilityRole="link"
              accessibilityLabel="Ouvrir sur Amazon"
              onPress={() => void Linking.openURL(amazonLink)}
            >
              <ExternalLink size={16} color={t.accentText} />
            </Pressable>
          ) : undefined
        }
      >
        <FactGrid>
          <Fact label="ASIN" value={str(az?.asin) ?? item.asin} mono />
          <Fact label="Note" value={num(az?.rating) != null ? `${az?.rating}/5 ⭐` : null} />
          <Fact label="BuyBox" tag="TTC" value={num(az?.buyboxPriceTTC) != null ? formatEuro(num(az?.buyboxPriceTTC)) : null} accent />
          <Fact label="Vendeur" value={str(az?.buyboxSeller) ?? item.buyboxSeller} />
          <Fact label="FBA" value={az ? ((az.fulfilledByAmazon as boolean) ? 'Oui' : 'Non') : null} />
          <Fact label="Livraison" value={str(az?.deliveryTime)} />
        </FactGrid>
      </FicheSection>
    </>
  );
}

// ─── Fournisseurs ────────────────────────────────────────────────────────────

export function SuppliersSection({ item, editable }: { item: StagingItem; editable: boolean }) {
  const styles = useStyles();
  const t = useTheme();
  const { distributors } = useDistributors();
  const rows = buildSupplierRows(item.distributorOffers, distributors, {
    codeEbat: item.codeEbat,
    warehouse: item.warehouse,
  });
  const canEdit = editable && item.status !== 'LAUNCHED';

  return (
    <FicheSection
      title="Fournisseurs"
      subtitle={`${rows.filter((r) => r.offer).length} offre${rows.filter((r) => r.offer).length > 1 ? 's' : ''}`}
      dot="#0EA5E9"
      right={
        canEdit ? (
          <Pressable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Gérer les codes fournisseurs"
            onPress={() => openPaEdit('supplier-codes', { uuid: item.uuid })}
            style={styles.headerAction}
          >
            <Pencil size={13} color={t.accentText} />
            <Text style={styles.headerActionText}>Codes</Text>
          </Pressable>
        ) : undefined
      }
    >
      {rows.length === 0 ? <SectionHint text="Aucune offre fournisseur sur ce produit." /> : null}
      <View style={styles.list}>
        {rows.map((row) => (
          <View
            key={row.key}
            style={[styles.supplier, row.bestPrice && { borderColor: withAlpha(t.success, 0.5) }]}
          >
            <View style={styles.supplierHead}>
              <Text style={styles.supplierName} numberOfLines={1}>
                {row.distributorName}
                {row.warehouseName ? ` · ${row.warehouseName}` : ''}
              </Text>
              {row.primary ? <Mini label="Principal" color={t.accentText} /> : null}
              {row.bestPrice ? <Mini label="Meilleur prix" color={t.success} /> : null}
              {row.offer?.plannedDep ? <Mini label="DEP" color="#6366F1" /> : null}
              {row.offer?.track === 'DISTRIBUTOR_CLEARANCE' ? <Mini label="Déstockage" color={t.warning} /> : null}
            </View>
            {row.offer ? (
              <>
                <View style={styles.supplierLine}>
                  <Text style={styles.code} numberOfLines={1}>
                    {row.code ?? 'Code manquant'}
                  </Text>
                  <StockBadge readiness={row.readiness} quantity={row.stockWarehouse} />
                </View>
                <View style={styles.supplierLine}>
                  <Text style={styles.price}>
                    PA {formatEuro(row.purchasePriceHT)}
                    {row.multiplier > 1 ? (
                      <Text style={styles.muted}>
                        {' '}
                        ×{row.multiplier} = {formatEuro(row.effectivePA)}
                      </Text>
                    ) : null}
                  </Text>
                  {row.marginPercent != null ? (
                    <Text
                      style={[
                        styles.margin,
                        { color: row.marginPercent >= 7 ? t.success : row.marginPercent >= 3 ? t.warning : t.danger },
                      ]}
                    >
                      {formatPercent(row.marginPercent)}
                    </Text>
                  ) : null}
                </View>
                {row.saleUnit || row.salesPackaging ? (
                  <Text style={styles.muted}>
                    Unité {row.saleUnit ?? '—'}
                    {row.salesPackaging ? ` · conditionnement ${row.salesPackaging}` : ''}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.muted}>Pas d’offre : code interne manquant chez ce fournisseur.</Text>
            )}
          </View>
        ))}
      </View>
    </FicheSection>
  );
}

// ─── Marketplaces ────────────────────────────────────────────────────────────

type MpConfig = { platform: BuyBoxMarketplace; data: MarketplaceData | null | undefined; url: (d: MarketplaceData) => string | null };

export function MarketplacesSection({
  item,
  viability,
  loading,
  onRefresh,
}: {
  item: StagingItem;
  viability: MarketplaceViabilityResult | null | undefined;
  loading: boolean;
  onRefresh?: () => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  const { hasSnapshot } = snapshotOf(item);
  const full = item.fullAnalysisSnapshot;
  const configs: MpConfig[] = [
    {
      platform: 'MANOMANO',
      data: full?.manomano ?? item.manomano,
      url: (d) => (d.productId != null ? getManomanoUrl(Number(d.productId)) : null),
    },
    {
      platform: 'LEROY_MERLIN',
      data: full?.leroyMerlin ?? item.leroyMerlin,
      url: (d) => (d.sku ? getLeroyMerlinUrl(d.sku) : null),
    },
    {
      platform: 'CASTORAMA',
      data: full?.castorama ?? item.castorama,
      url: (d) => (d.sku ? getCastoramaUrl(d.sku) : null),
    },
  ];
  const viabilityMap = new Map<BuyBoxMarketplace, MarketplaceViabilityEntry>();
  for (const e of viability?.entries ?? []) viabilityMap.set(e.platform, e);

  const platforms: BuyBoxMarketplace[] = [
    ...configs.filter((c) => !!c.data).map((c) => c.platform),
    ...[...viabilityMap.keys()].filter((p) => !configs.some((c) => c.platform === p && !!c.data)),
  ];
  const unique = [...new Set(platforms)];
  if (unique.length === 0 && !loading && hasSnapshot === false) return null;

  return (
    <FicheSection
      title="Marketplaces"
      subtitle="Présence EAN · viabilité plateformes"
      dot="#6366F1"
      right={
        onRefresh ? (
          <Pressable
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Actualiser la viabilité"
            onPress={onRefresh}
          >
            <RefreshCw size={16} color={t.accentText} />
          </Pressable>
        ) : undefined
      }
    >
      {unique.length === 0 ? (
        <SectionHint text={loading ? 'Chargement…' : 'Aucune présence détectée sur ManoMano, Leroy Merlin ou Castorama.'} />
      ) : null}
      <View style={styles.list}>
        {unique.map((platform) => {
          const cfg = configs.find((c) => c.platform === platform);
          const presence = cfg?.data ?? null;
          const entry = viabilityMap.get(platform);
          const color = PLATFORM_COLORS[platform] ?? t.accent;
          const url = entry?.productUrl ?? (presence && cfg ? cfg.url(presence) : null);
          const best = viability?.bestPlatform === platform;
          const mirakl = platform === 'LEROY_MERLIN' || platform === 'CASTORAMA';
          const marginColor = !entry
            ? t.text
            : entry.marginPercent >= 12
              ? '#16A34A'
              : entry.marginPercent >= 5
                ? '#94C83D'
                : entry.marginPercent >= 0
                  ? '#F59E0B'
                  : '#EF4444';
          return (
            <View key={platform} style={[styles.supplier, { borderColor: withAlpha(color, 0.45) }]}>
              <View style={styles.supplierHead}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <Text style={[styles.supplierName, { color }]} numberOfLines={1}>
                  {PLATFORM_LABELS[platform]}
                </Text>
                {presence ? (
                  <Mini label={presence.found ? 'Présent' : 'Absent'} color={presence.found ? t.success : t.textFaint} />
                ) : null}
                {best ? <Mini label="Meilleure" color={t.success} /> : null}
                {mirakl && presence?.active != null ? (
                  <Mini label={presence.active ? 'Actif' : 'Inactif'} color={presence.active ? t.success : t.warning} />
                ) : null}
                <View style={{ flex: 1 }} />
                {url ? (
                  <Pressable
                    hitSlop={10}
                    accessibilityRole="link"
                    accessibilityLabel={`Voir sur ${PLATFORM_LABELS[platform]}`}
                    onPress={() => void Linking.openURL(url)}
                  >
                    <ExternalLink size={15} color={t.accentText} />
                  </Pressable>
                ) : null}
              </View>
              {presence?.title ? (
                <Text style={styles.muted} numberOfLines={2}>
                  {presence.title}
                </Text>
              ) : null}
              {presence?.productId != null || presence?.sku ? (
                <Text style={styles.code}>{presence.productId != null ? `ID ${presence.productId}` : `SKU ${presence.sku}`}</Text>
              ) : null}
              {entry ? (
                <View style={styles.supplierLine}>
                  <Text style={styles.price}>{formatEuro(entry.priceTTC)} TTC</Text>
                  <Text style={[styles.margin, { color: marginColor }]}>{formatPercent(entry.marginPercent)}</Text>
                  <Text
                    style={[
                      styles.price,
                      { color: (entry.viabilityScore ?? 0) >= 0 ? t.success : t.danger },
                    ]}
                  >
                    Éq. {(entry.viabilityScore ?? 0) >= 0 ? '+' : ''}
                    {formatEuro(entry.viabilityScore ?? 0)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.muted}>{presence?.found ? 'Présent · pas de cotation' : 'Pas de cotation'}</Text>
              )}
              {entry?.seller || (entry?.customerRating ?? presence?.customerRating) != null ? (
                <Text style={styles.muted}>
                  {entry?.seller ? `${entry.seller}` : ''}
                  {(entry?.customerRating ?? presence?.customerRating) != null
                    ? `${entry?.seller ? ' · ' : ''}${entry?.customerRating ?? presence?.customerRating}/5 ⭐ (${formatInteger(entry?.reviewCount ?? presence?.reviewCount ?? 0)})`
                    : ''}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </FicheSection>
  );
}

// ─── Demandes de négociation par fournisseur ─────────────────────────────────

export function NegoRequestsSection({
  uuid,
  requests,
  editable,
}: {
  uuid: string;
  requests: NegotiationRequest[] | undefined;
  editable: boolean;
}) {
  const styles = useStyles();
  const t = useTheme();
  if (!requests || requests.length === 0) return null;

  return (
    <FicheSection
      title="Demandes par fournisseur"
      subtitle={summarizeRequests(requests)}
      dot="#0EA5E9"
    >
      {groupByWarehouse(requests).map(([warehouse, list]) => (
        <View key={warehouse} style={styles.group}>
          <Text style={styles.groupTitle}>{warehouse}</Text>
          {list.map((r, i) => (
            <View key={`${r.opportunityUuid ?? 'dep'}-${i}`} style={styles.requestRow}>
              <View style={styles.requestText}>
                <Text style={styles.supplierName} numberOfLines={1}>
                  {r.distributorName ?? 'Fournisseur inconnu'}
                </Text>
                <Text style={styles.muted}>{requestLabel(r)}</Text>
              </View>
              {r.requestedMinPriceHT != null ? (
                <View style={styles.requestPrice}>
                  <Text style={[styles.price, { color: t.warning }]}>{formatEuro(r.requestedMinPriceHT)}</Text>
                  {r.depExtraDiscountPercent ? <Mini label={`−${r.depExtraDiscountPercent} % DEP`} color="#6366F1" /> : null}
                </View>
              ) : null}
              {editable && canEditRequestPrice(r) ? (
                <Pressable
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Modifier le prix demandé à ${r.distributorName ?? 'ce fournisseur'}`}
                  onPress={() =>
                    openPaEdit('nego-price', {
                      uuid,
                      opportunityUuid: r.opportunityUuid as string,
                      price: String(r.requestedMinPriceBaseHT ?? r.requestedMinPriceHT ?? ''),
                      label: `${r.warehouse ?? ''} · ${r.distributorName ?? ''}`,
                    })
                  }
                >
                  <Pencil size={14} color={t.accentText} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ))}
    </FicheSection>
  );
}

const useStyles = makeStyles((t) => ({
  mini: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.full },
  miniText: { fontSize: 10, fontWeight: '800' },
  list: { gap: spacing.sm },
  supplier: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  supplierHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  supplierName: { flexShrink: 1, fontSize: fontSize.sm, fontWeight: '800', color: t.text },
  supplierLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  code: { flexShrink: 1, fontFamily: monoFontFamily, fontSize: 12, color: t.textMuted },
  price: { fontSize: 12, fontWeight: '700', color: t.text, fontVariant: ['tabular-nums'] },
  margin: { fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'] },
  muted: { fontSize: 11, color: t.textMuted },
  dot: { width: 8, height: 8, borderRadius: 4 },
  headerAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  headerActionText: { fontSize: 12, fontWeight: '700', color: t.accentText },
  group: { gap: spacing.xs },
  groupTitle: { fontSize: 10, fontWeight: '800', color: t.textSubtle, textTransform: 'uppercase' },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.surface,
  },
  requestText: { flex: 1, gap: 1 },
  requestPrice: { alignItems: 'flex-end', gap: 2 },
}));
