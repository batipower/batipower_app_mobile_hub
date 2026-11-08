import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { ExternalLink } from 'lucide-react-native';

import { formatEuro, formatInteger, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { StagingItem, ViabilityCountry, ViabilityStatus , AgencyStockDetail, StockReadiness } from '@/types/hubProductAnalyzer';

import { agencyDisplayName, computeCiblesGrid, getViab } from '../../lib/helpers';
import {
  MP_FLAGS,
  MP_KEYS,
  PA_DEFINITIONS,
  PA_LABELS,
  SR_CFG,
  VIAB_STATUS_CFG,
  getAmazonUrl,
} from '../../lib/constants';
import { num, snapshotOf, str } from '../../lib/snapshot';
import { SupplierStockDetail, offersWithStock } from '../SupplierStock';
import { FicheSection, SectionHint } from './FicheSection';

const COMMISSIONS = [13, 14, 15] as const;
const MARGINS = [0, 5, 7, 10, 12] as const;

function Pill({ label, color }: { label: string; color: string }) {
  const styles = useStyles();
  return (
    <View style={[styles.pill, { backgroundColor: withAlpha(color, 0.14), borderColor: withAlpha(color, 0.35) }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

function Tile({ label, value, tone, tag }: { label: string; value: string; tone?: string; tag?: string }) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={[styles.tile, tone ? { borderColor: withAlpha(tone, 0.4), backgroundColor: withAlpha(tone, 0.08) } : null]}>
      <Text style={[styles.tileLabel, tone ? { color: tone } : null]} numberOfLines={1}>
        {label}
        {tag ? <Text style={{ color: t.textFaint }}> {tag}</Text> : null}
      </Text>
      <Text style={[styles.tileValue, tone ? { color: tone } : null]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

// ─── Synthèse multi-pays ─────────────────────────────────────────────────────

/** Synthèse marketplace : PA actuel / recommandé / plafond de négo / marge, par pays, + grille des cibles. */
export function SynthesisSection({ item }: { item: StagingItem }) {
  const styles = useStyles();
  const t = useTheme();
  const { tg, viabilityByCountry } = snapshotOf(item);
  const available = MP_KEYS.filter((c) => (c === 'FR' && !!tg) || !!viabilityByCountry?.[c]);
  const [picked, setPicked] = useState<ViabilityCountry>('FR');
  const [showGrid, setShowGrid] = useState(false);
  const active: ViabilityCountry = available.includes(picked) ? picked : (available[0] ?? 'FR');

  if (available.length === 0) {
    return (
      <FicheSection title="Synthèse marketplace" dot="#F59E0B">
        <SectionHint text="Aucune synthèse : prix BuyBox ou grille de transport manquants." />
      </FicheSection>
    );
  }

  let pa: number | null = item.customerPriceHT;
  let recom: number | null = null;
  let plafond: number | null = null;
  let marge: number | null = null;
  let status: ViabilityStatus | null = null;
  let pvTTC: number | null = null;
  let pvHT: number | null = null;
  let transp: number | null = null;
  let vatPct = 20;
  let gap: number | null = null;
  let origin: string | null = null;
  let grid: Record<string, number | null> = {};
  const paConfirmed = (tg?.purchasePriceConfirmed as boolean | undefined) ?? true;

  if (active === 'FR' && tg) {
    pa = num(tg.currentBuyPrice) ?? item.customerPriceHT;
    recom = num(tg.recommendedBuyPrice);
    plafond = num(tg.cible15);
    marge = num(tg.marginPercent);
    status = (tg.viabilityStatus as ViabilityStatus | null) ?? null;
    pvTTC = num(tg.pvTTC);
    pvHT = num(tg.pvHT);
    transp = num(tg.carrierCostHT);
    gap = num(tg.negotiationGapHT);
    origin = 'amazon_buybox';
    for (const c of COMMISSIONS) {
      for (const m of MARGINS) {
        const k = m === 0 ? `cible${c}` : `cible${c}_${m}`;
        grid[k] = num(tg[k]);
      }
    }
  } else {
    const v = viabilityByCountry?.[active];
    if (v) {
      recom = v.recommendedBuyPrice;
      pvTTC = v.sourcePriceTTC;
      pvHT = v.pvHT;
      transp = v.carrierCostHT;
      vatPct = Math.round((v.vatRate - 1) * 100);
      gap = v.negotiationGapHT;
      origin = v.sourcePriceOrigin;
      marge = v.marginPercent;
      status = v.viabilityStatus;
      grid = computeCiblesGrid(v.pvHT, v.carrierCostHT);
      plafond = grid.cible15 ?? null;
    }
  }

  const badge =
    marge != null
      ? (() => {
          const v = getViab(marge);
          return <Pill label={v.label} color={v.color} />;
        })()
      : status
        ? (() => {
            const v = VIAB_STATUS_CFG[status];
            return <Pill label={v.label} color={v.color} />;
          })()
        : undefined;

  const margeColor = marge == null ? undefined : marge >= 7 ? t.success : marge >= 3 ? t.warning : t.danger;
  const subtitle = `${MP_FLAGS[active]} ${active} · TVA ${vatPct} %${
    origin === 'junglescout' ? ' · prix Jungle Scout' : origin === 'amazon_buybox' ? ' · prix BuyBox' : ''
  }`;

  return (
    <FicheSection title="Synthèse marketplace" subtitle={subtitle} dot="#F59E0B" right={badge}>
      <View style={styles.countryTabs}>
        {MP_KEYS.map((c) => {
          const enabled = available.includes(c);
          const selected = active === c;
          return (
            <Pressable
              key={c}
              disabled={!enabled}
              onPress={() => setPicked(c)}
              accessibilityRole="tab"
              accessibilityState={{ selected, disabled: !enabled }}
              accessibilityLabel={enabled ? `Synthèse ${c}` : `${c} : pas de calcul`}
              style={[
                styles.countryTab,
                selected && { backgroundColor: withAlpha(t.accent, 0.14), borderColor: t.accent },
                !enabled && { opacity: 0.35 },
              ]}
            >
              <Text style={styles.countryFlag}>{MP_FLAGS[c]}</Text>
              <Text style={[styles.countryCode, selected && { color: t.accentText }]}>{c}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.tiles}>
        <Tile label={paConfirmed ? 'PA fourn.' : 'PA estimé'} tag="HT" value={formatEuro(pa)} />
        <Tile label="PA recom." tag="HT" value={formatEuro(recom)} tone={t.success} />
        <Tile label="Plafond négo" tag="HT" value={formatEuro(plafond)} tone={t.warning} />
        <Tile label="Marge" value={marge != null ? formatPercent(marge) : '—'} tone={margeColor} />
      </View>
      <View style={styles.tiles}>
        <Tile label="PV TTC" value={formatEuro(pvTTC)} />
        <Tile label="PV HT" value={formatEuro(pvHT)} />
        <Tile label="Transport" value={formatEuro(transp)} />
        <Tile
          label="Écart négo"
          value={gap != null ? (gap > 0 ? `−${formatEuro(gap)}` : '✓') : '—'}
          tone={gap != null && gap > 0 ? t.warning : t.success}
        />
      </View>

      <Pressable
        onPress={() => setShowGrid((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: showGrid }}
        style={styles.gridToggle}
      >
        <Text style={styles.gridToggleText}>
          {showGrid ? 'Masquer' : 'Afficher'} la grille PA HT (commission × marge)
        </Text>
      </Pressable>
      {showGrid ? (
        <View style={styles.table}>
          <View style={[styles.tr, { backgroundColor: t.surface }]}>
            <Text style={[styles.th, styles.thFirst]}>Comm.</Text>
            {MARGINS.map((m) => (
              <Text key={m} style={[styles.th, m === 7 && { color: t.success }]}>
                {m} %
              </Text>
            ))}
          </View>
          {COMMISSIONS.map((c) => (
            <View key={c} style={styles.tr}>
              <Text style={[styles.td, styles.thFirst, { fontWeight: '700' }]}>{c} %</Text>
              {MARGINS.map((m) => {
                const k = m === 0 ? `cible${c}` : `cible${c}_${m}`;
                const recommended = c === 14 && m === 7;
                const value = grid[k];
                return (
                  <Text
                    key={m}
                    style={[styles.td, recommended && { color: t.success, fontWeight: '800' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {value != null ? value.toFixed(2).replace('.', ',') : '—'}
                  </Text>
                );
              })}
            </View>
          ))}
        </View>
      ) : null}
      <Text style={styles.footnote}>
        {PA_LABELS.max} : {PA_DEFINITIONS.max}
      </Text>
    </FicheSection>
  );
}

// ─── Viabilité & ventes par pays ─────────────────────────────────────────────

export function ViabilitySection({ item }: { item: StagingItem }) {
  const styles = useStyles();
  const t = useTheme();
  const { viabilityByCountry, sa, az } = snapshotOf(item);
  const asin = str(az?.asin) ?? item.asin;

  return (
    <FicheSection
      title="Viabilité & ventes par pays"
      subtitle="PV TTC × TVA + transport + cible 14 % / 7 % · ventes 30 j"
      dot="#6366F1"
    >
      <View style={styles.rows}>
        {MP_KEYS.map((country) => {
          const v = viabilityByCountry?.[country];
          const sales = (sa?.[country] as Record<string, unknown> | null | undefined) ?? null;
          const units = sales ? num(sales.approximate30DayUnitsSold) : null;
          const revenue = sales ? num(sales.approximate30DayRevenue) : null;
          const cfg = v ? VIAB_STATUS_CFG[v.viabilityStatus] : null;
          return (
            <View
              key={country}
              style={[styles.countryRow, cfg && { borderColor: withAlpha(cfg.color, 0.4) }]}
              accessible
              accessibilityLabel={
                v
                  ? `${country} : marge ${formatPercent(v.marginPercent)}, ${cfg?.label}, PA max ${formatEuro(v.recommendedBuyPrice)}`
                  : `${country} : pas de calcul`
              }
            >
              <View style={[styles.countryHead, cfg && { backgroundColor: withAlpha(cfg.color, 0.1) }]}>
                <Text style={styles.countryFlag}>{MP_FLAGS[country]}</Text>
                <Text style={styles.countryName}>{country}</Text>
                {asin ? (
                  <Pressable
                    hitSlop={10}
                    accessibilityRole="link"
                    accessibilityLabel={`Ouvrir sur Amazon ${country}`}
                    onPress={() => void Linking.openURL(getAmazonUrl(country, asin))}
                  >
                    <ExternalLink size={13} color={t.accentText} />
                  </Pressable>
                ) : null}
                <View style={{ flex: 1 }} />
                {v && cfg ? (
                  <>
                    <Text style={[styles.countryMargin, { color: cfg.color }]}>{formatPercent(v.marginPercent)}</Text>
                    <Pill label={cfg.label} color={cfg.color} />
                  </>
                ) : (
                  <Text style={styles.nc}>n/c</Text>
                )}
              </View>
              {v ? (
                <View style={styles.countryBody}>
                  <Metric label="PV TTC" value={formatEuro(v.sourcePriceTTC)} />
                  <Metric label={`HT · ${Math.round((v.vatRate - 1) * 100)} %`} value={formatEuro(v.pvHT)} />
                  <Metric label="Transp." value={formatEuro(v.carrierCostHT)} tone="#8B5CF6" />
                  <Metric label={PA_LABELS.maxShort} value={formatEuro(v.recommendedBuyPrice)} tone={cfg?.color} bold />
                </View>
              ) : null}
              <View style={styles.countryFoot}>
                <Text style={styles.footText}>
                  {units != null ? `${formatInteger(units)} u / 30 j` : 'Ventes : —'}
                  {revenue != null ? ` · ${formatEuro(revenue)}` : ''}
                </Text>
                {v && v.viabilityStatus === 'NEGOTIABLE' && v.negotiationGapHT > 0 ? (
                  <Text style={[styles.footText, { color: t.warning, fontWeight: '800' }]}>
                    −{formatEuro(v.negotiationGapHT)} à négocier
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </FicheSection>
  );
}

function Metric({ label, value, tone, bold }: { label: string; value: string; tone?: string; bold?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.metricValue, tone ? { color: tone } : null, bold && { fontWeight: '900' }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

// ─── Ventes Amazon 30 jours (histogramme) ────────────────────────────────────

export function SalesSection({ item }: { item: StagingItem }) {
  const styles = useStyles();
  const { sa } = snapshotOf(item);
  const data = MP_KEYS.map((country) => {
    const s = (sa?.[country] as Record<string, unknown> | null | undefined) ?? null;
    return { country, units: s ? (num(s.approximate30DayUnitsSold) ?? 0) : 0, revenue: s ? (num(s.approximate30DayRevenue) ?? 0) : 0 };
  });
  const max = Math.max(1, ...data.map((d) => d.units));
  const totalUnits = data.reduce((sum, d) => sum + d.units, 0);
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <FicheSection
      title="Ventes Amazon · 30 jours"
      subtitle={
        totalUnits > 0
          ? `${formatInteger(totalUnits)} unités · ${formatEuro(totalRevenue)} de CA`
          : 'Aucune vente détectée (Jungle Scout)'
      }
      dot="#FF9900"
      defaultOpen={totalUnits > 0}
    >
      <View style={styles.rows}>
        {data.map((d) => (
          <View
            key={d.country}
            style={styles.barRow}
            accessible
            accessibilityLabel={`${d.country} : ${d.units > 0 ? `${d.units} unités, ${formatEuro(d.revenue)}` : 'aucune vente'}`}
          >
            <Text style={styles.countryFlag}>{MP_FLAGS[d.country]}</Text>
            <Text style={styles.barCountry}>{d.country}</Text>
            <View style={styles.barTrack}>
              {d.units > 0 ? <View style={[styles.barFill, { width: `${(d.units / max) * 100}%` }]} /> : null}
              <Text style={[styles.barValue, d.units === 0 && { opacity: 0.4 }]}>
                {d.units > 0 ? `${formatInteger(d.units)} u` : '—'}
              </Text>
            </View>
            <Text style={[styles.barRevenue, d.units === 0 && { opacity: 0.4 }]} numberOfLines={1}>
              {d.units > 0 ? formatEuro(d.revenue) : '—'}
            </Text>
          </View>
        ))}
      </View>
    </FicheSection>
  );
}

// ─── Stock & disponibilité ───────────────────────────────────────────────────

type AgencyBlock = { total: number; details: AgencyStockDetail[] } | null | undefined;

export function StockSection({ item }: { item: StagingItem }) {
  const styles = useStyles();
  const t = useTheme();
  const { eb } = snapshotOf(item);
  const sb = (eb?.stockBreakdown as Record<string, unknown> | null | undefined) ?? null;
  const warehouse = item.warehouse ?? '';
  const mainStock = num(sb?.mainWarehouse) ?? num(eb?.stockWarehouse) ?? item.stockWarehouse;
  const readiness = ((sb?.readiness as StockReadiness | undefined) ?? item.stockReadiness) ?? null;
  const nearby = (sb?.nearbyAgencies as AgencyBlock) ?? (item.nearbyAgencyDetails
    ? { total: item.stockNearbyAgencies ?? 0, details: item.nearbyAgencyDetails }
    : null);
  const other = (sb?.otherAgencies as AgencyBlock) ?? (item.otherAgencyDetails
    ? { total: item.stockOtherAgencies ?? 0, details: item.otherAgencyDetails }
    : null);
  const total = num(sb?.allWarehouses) ?? num(eb?.stockTotal) ?? item.stockTotal;
  const cfg = readiness ? SR_CFG[readiness] : null;

  return (
    <FicheSection
      title="Stock & disponibilité"
      dot="#10B981"
      right={cfg ? <Pill label={`${cfg.shortLabel}${mainStock ? ` · ${mainStock}` : ''}`} color={cfg.color} /> : undefined}
      defaultOpen={false}
    >
      {cfg ? (
        <View style={[styles.notice, { backgroundColor: withAlpha(cfg.color, 0.1), borderColor: withAlpha(cfg.color, 0.35) }]}>
          <Text style={[styles.noticeText, { color: cfg.color }]}>{cfg.desc}</Text>
        </View>
      ) : null}
      <View style={styles.stockRow}>
        <Text style={styles.stockLabel}>Entrepôt principal{warehouse ? ` (${warehouse})` : ''}</Text>
        <Text style={[styles.stockValue, { color: mainStock && mainStock > 0 ? t.success : t.danger }]}>
          {mainStock != null ? formatInteger(mainStock) : '—'}
        </Text>
      </View>
      {nearby && nearby.total > 0 ? <Agencies title="Agences proches (J+1)" block={nearby} tone={t.warning} warehouse={warehouse} /> : null}
      {other && other.total > 0 ? <Agencies title="Autres agences" block={other} tone="#EA580C" warehouse={warehouse} /> : null}
      <View style={[styles.stockRow, styles.stockTotal]}>
        <Text style={styles.stockLabel}>Stock total, tous entrepôts</Text>
        <Text style={styles.stockValue}>{total != null ? formatInteger(total) : '—'}</Text>
      </View>
      <SupplierStockDetail offers={offersWithStock(item.distributorOffers)} itemWarehouse={warehouse} />
    </FicheSection>
  );
}

function Agencies({ title, block, tone, warehouse }: { title: string; block: { total: number; details: AgencyStockDetail[] }; tone: string; warehouse: string }) {
  const styles = useStyles();
  return (
    <View style={[styles.agencies, { borderColor: withAlpha(tone, 0.35), backgroundColor: withAlpha(tone, 0.06) }]}>
      <View style={styles.stockRow}>
        <Text style={[styles.agenciesTitle, { color: tone }]}>{title}</Text>
        <Text style={[styles.stockValue, { color: tone }]}>{formatInteger(block.total)}</Text>
      </View>
      {block.details.map((a) => (
        <View key={a.code} style={styles.stockRow}>
          <Text style={styles.agencyName} numberOfLines={1}>
            {agencyDisplayName(a, warehouse)} <Text style={styles.agencyCode}>({a.code})</Text>
          </Text>
          <Text style={styles.agencyQty}>{formatInteger(a.quantity)}</Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '800' },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    flex: 1,
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  tileLabel: { fontSize: 9, fontWeight: '700', color: t.textSubtle, textTransform: 'uppercase' },
  tileValue: { fontSize: fontSize.sm, fontWeight: '900', color: t.text },
  countryTabs: { flexDirection: 'row', gap: spacing.xs },
  countryTab: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
  },
  countryFlag: { fontSize: fontSize.sm },
  countryCode: { fontSize: 12, fontWeight: '800', color: t.textMuted },
  gridToggle: { paddingVertical: spacing.xs },
  gridToggleText: { fontSize: fontSize.xs, fontWeight: '700', color: t.accentText },
  table: { borderRadius: radius.md, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: t.border },
  th: { flex: 1, paddingVertical: 5, textAlign: 'center', fontSize: 10, fontWeight: '800', color: t.textMuted },
  thFirst: { flex: 0, width: 46, paddingLeft: spacing.sm, textAlign: 'left' },
  td: { flex: 1, paddingVertical: 6, textAlign: 'center', fontSize: 11, color: t.text, fontVariant: ['tabular-nums'] },
  footnote: { fontSize: 10, color: t.textSubtle, lineHeight: 14 },
  rows: { gap: spacing.sm },
  countryRow: { borderRadius: radius.md, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
  countryHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 6 },
  countryName: { fontSize: 12, fontWeight: '800', color: t.text },
  countryMargin: { fontSize: fontSize.sm, fontWeight: '900', fontVariant: ['tabular-nums'] },
  nc: { fontSize: 11, fontStyle: 'italic', color: t.textFaint },
  countryBody: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  countryFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: t.border,
  },
  footText: { fontSize: 11, color: t.textMuted },
  metric: { flex: 1, gap: 1 },
  metricLabel: { fontSize: 9, fontWeight: '700', color: t.textSubtle, textTransform: 'uppercase' },
  metricValue: { fontSize: 12, fontWeight: '700', color: t.text, fontVariant: ['tabular-nums'] },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barCountry: { width: 22, fontSize: 11, fontWeight: '800', color: t.textMuted },
  barTrack: {
    flex: 1,
    height: 22,
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: t.surface,
    overflow: 'hidden',
  },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radius.sm, backgroundColor: '#FFB347' },
  barValue: { alignSelf: 'flex-end', paddingRight: 6, fontSize: 11, fontWeight: '800', color: t.text },
  barRevenue: { width: 76, textAlign: 'right', fontSize: 11, fontWeight: '600', color: t.textMuted },
  notice: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  noticeText: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  stockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  stockLabel: { flex: 1, fontSize: fontSize.xs, color: t.textMuted },
  stockValue: { fontSize: fontSize.sm, fontWeight: '900', color: t.text, fontVariant: ['tabular-nums'] },
  stockTotal: { paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: t.border },
  agencies: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  agenciesTitle: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  agencyName: { flex: 1, fontSize: 12, color: t.text },
  agencyCode: { color: t.textFaint },
  agencyQty: { fontSize: 12, fontWeight: '700', color: t.text, fontVariant: ['tabular-nums'] },
}));
