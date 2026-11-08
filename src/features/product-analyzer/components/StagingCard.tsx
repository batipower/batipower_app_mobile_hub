import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Layers, Scale } from 'lucide-react-native';

import { Badge } from '@/components/ui';
import { usePaFilters } from '@/features/product-analyzer/filtersStore';
import { VIAB_STATUS_CFG } from '@/features/product-analyzer/lib/constants';
import { getViab } from '@/features/product-analyzer/lib/helpers';
import type { NegotiationOpportunitySummary } from '@/features/product-analyzer/lib/negotiation-api';
import { formatEuro, formatPercent, formatRelative } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, radius, shadow, spacing, useTheme, withAlpha } from '@/theme';
import type { NegotiationRequest, StagingItem, ViabilityCountry } from '@/types/hubProductAnalyzer';

import { CountryChips } from './CountryChips';
import { MpBars } from './MpBars';
import { StatusBadge } from './StatusBadge';
import { StockBadge } from './StockBadge';
import { SupplierStockLines, offersWithStock } from './SupplierStock';

type StagingCardProps = {
  item: StagingItem;
  selected: boolean;
  /** Mode sélection actif : l'appui coche / décoche au lieu d'ouvrir la fiche. */
  selecting: boolean;
  openNego?: NegotiationOpportunitySummary | null;
  requests?: NegotiationRequest[];
  focusCountry?: string;
  onPress: (item: StagingItem) => void;
  onLongPress: (item: StagingItem) => void;
  onPressCountry?: (country: ViabilityCountry) => void;
};

const REQUEST_LABEL: Record<NegotiationRequest['kind'], string> = {
  NEGO: 'Négo',
  NEGO_ORIGIN: 'Négo d’origine',
  DEP: 'DEP',
};

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color ? { color } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/**
 * Carte d'une analyse de l'historique : identité, viabilité, prix d'achat, pays, ventes Amazon,
 * stock et état des négociations. Appui = fiche ; appui long = début de sélection multiple.
 */
function StagingCardBase({
  item,
  selected,
  selecting,
  openNego,
  requests,
  focusCountry,
  onPress,
  onLongPress,
  onPressCountry,
}: StagingCardProps) {
  const styles = useStyles();
  const t = useTheme();
  const { stockDistributorIds } = usePaFilters();
  const stockOffers = offersWithStock(item.distributorOffers);

  const analyzed = item.viabilityStatus != null || item.marginPercent != null;
  const viab = analyzed ? getViab(item.marginPercent, item.viabilityStatus) : null;
  const gap = item.viabilityStatus === 'NEGOTIABLE' ? item.negotiationGapHT : null;

  const meta = [item.brand, item.ean, item.codeEbat].filter(Boolean).join(' · ');
  const depNames = (item.distributorOffers ?? [])
    .filter((o) => o.plannedDep)
    .map((o) => o.distributor?.name ?? 'DEP');
  const affaires = [...new Set((item.affaireLinks ?? []).map((l) => l.affaireName))];
  const tags = item.tags ?? [];
  const visibleRequests = (requests ?? []).filter((r) => r.kind !== 'NEGO_ORIGIN').slice(0, 2);
  const hasNego = !!openNego || visibleRequests.some((r) => r.kind === 'NEGO');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${item.designation ?? 'Sans désignation'}${
        viab ? `, ${viab.label}` : ''
      }${selected ? ', sélectionné' : ''}`}
      accessibilityHint={selecting ? 'Coche ou décoche ce produit' : 'Ouvre la fiche du produit'}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      delayLongPress={280}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.header}>
        {selecting ? (
          <View style={[styles.check, selected && styles.checkOn]}>
            {selected ? <Check size={14} color={t.onAccent} strokeWidth={3} /> : null}
          </View>
        ) : null}
        <View style={styles.identity}>
          <Text style={styles.designation} numberOfLines={2}>
            {item.designation?.trim() || 'Sans désignation'}
          </Text>
          {meta ? (
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.viabRow}>
        {viab ? (
          <View style={[styles.viabBlock, { backgroundColor: withAlpha(viab.color, 0.13) }]}>
            <Text style={[styles.viabMargin, { color: viab.color }]}>
              {formatPercent(item.marginPercent)}
            </Text>
            <Text style={[styles.viabLabel, { color: viab.color }]} numberOfLines={1}>
              {viab.label}
            </Text>
          </View>
        ) : (
          <View style={[styles.viabBlock, { backgroundColor: t.surface }]}>
            <Text style={[styles.viabMargin, { color: t.textSubtle }]}>—</Text>
            <Text style={[styles.viabLabel, { color: t.textSubtle }]}>Non analysé</Text>
          </View>
        )}
        <View style={styles.metrics}>
          <Metric label="PA max HT" value={formatEuro(item.recommendedBuyPrice)} />
          <Metric label="PA actuel HT" value={formatEuro(item.customerPriceHT)} />
          {gap != null && gap > 0 ? (
            <Metric
              label="À négocier"
              value={`−${formatEuro(gap)}`}
              color={VIAB_STATUS_CFG.NEGOTIABLE.color}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.signals}>
        <CountryChips
          data={item.viabilityByCountry}
          focusCountry={focusCountry}
          onPressCountry={onPressCountry}
        />
        <MpBars sales={item.salesAnalysis} asin={item.asin} />
      </View>

      {stockOffers.length > 0 ? (
        <SupplierStockLines offers={stockOffers} highlightIds={stockDistributorIds} />
      ) : null}

      <View style={styles.badges}>
        <StockBadge readiness={item.stockReadiness} quantity={item.stockWarehouse} />
        {item.weightPending ? (
          <View style={[styles.flag, { backgroundColor: withAlpha(t.warning, 0.14) }]}>
            <Scale size={11} color={t.warning} />
            <Text style={[styles.flagText, { color: t.warning }]}>Poids manquant</Text>
          </View>
        ) : null}
        {hasNego ? <Badge label="Négo en cours" tone="amber" /> : null}
        {visibleRequests.map((r, i) => (
          <Badge
            key={`${r.opportunityUuid ?? 'dep'}-${i}`}
            tone={r.kind === 'DEP' ? 'purple' : 'blue'}
            label={[
              REQUEST_LABEL[r.kind],
              r.warehouse ?? r.distributorName,
              r.requestedMinPriceHT != null ? formatEuro(r.requestedMinPriceHT) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        ))}
        {depNames.length > 0 ? <Badge label={`DEP ${depNames.join(', ')}`} tone="purple" /> : null}
        {item.forcedFromCatalogue ? <Badge label="Trace catalogue" tone="neutral" /> : null}
        {affaires.slice(0, 2).map((name) => (
          <View key={name} style={[styles.flag, { backgroundColor: withAlpha(t.info, 0.14) }]}>
            <Layers size={11} color={t.info} />
            <Text style={[styles.flagText, { color: t.info }]} numberOfLines={1}>
              {name}
            </Text>
          </View>
        ))}
        {tags.slice(0, 3).map((tag) => (
          <Badge key={tag} label={tag} tone="purple" />
        ))}
        {tags.length > 3 ? <Badge label={`+${tags.length - 3}`} tone="purple" /> : null}
      </View>

      <Text style={styles.date}>
        Analysé {formatRelative(item.lastAnalyzedAt ?? item.createdAt) ?? ''}
      </Text>
    </Pressable>
  );
}

export const StagingCard = memo(StagingCardBase);

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.border,
    backgroundColor: t.card,
    ...shadow.sm,
  },
  cardSelected: { borderColor: t.accent, borderWidth: 2, backgroundColor: withAlpha(t.accent, 0.07) },
  pressed: { backgroundColor: t.cardPressed },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  check: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: t.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { borderColor: t.accent, backgroundColor: t.accent },
  identity: { flex: 1, gap: 2 },
  designation: { fontSize: fontSize.sm, fontWeight: '700', color: t.text, lineHeight: 19 },
  meta: { fontFamily: monoFontFamily, fontSize: 11, color: t.textMuted },
  viabRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  viabBlock: {
    minWidth: 92,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  viabMargin: { fontSize: fontSize.lg, fontWeight: '800' },
  viabLabel: { fontSize: 10, fontWeight: '700' },
  metrics: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.xs, columnGap: spacing.lg },
  metric: { gap: 1 },
  metricLabel: { fontSize: 10, fontWeight: '600', color: t.textSubtle },
  metricValue: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  signals: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs + 2 },
  flag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 180,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  flagText: { flexShrink: 1, fontSize: 10, fontWeight: '700' },
  date: { fontSize: 11, color: t.textSubtle },
}));
