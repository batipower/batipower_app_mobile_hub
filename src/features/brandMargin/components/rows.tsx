import { memo, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { Badge, Button } from '@/components/ui';
import { formatDate, formatEuroWhole, formatInteger } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, radius, shadow, spacing, useTheme } from '@/theme';
import type { HubBrandMarginOrder, HubBrandMarginProduct } from '@/types/hubBrandMargin';

import { formatRate, marginColor } from '../lib/display';
import {
  SAV_CAUSE_GROUPS,
  marginOf,
  originLabel,
  rateOfCa,
  savGroupAmount,
  type MarginView,
} from '../lib/model';
import { ProductTraitBadges } from './ProductTraits';

/** Causes d'impact SAV d'un périmètre : « Casse 120 € · 2,1 % » par cause non nulle. */
function SavCauseLines({ figures }: { figures: Pick<HubBrandMarginProduct, 'sav' | 'caHT'> }) {
  const styles = useStyles();
  const t = useTheme();
  const causes = SAV_CAUSE_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    amount: savGroupAmount(figures, group),
  })).filter((cause) => Math.abs(cause.amount) >= 0.005);
  if (causes.length === 0) return null;
  return (
    <View style={styles.causes}>
      {causes.map((cause) => {
        const rate = rateOfCa(cause.amount, figures.caHT);
        return (
          <View key={cause.id} style={styles.cause}>
            <Text style={styles.causeLabel} numberOfLines={1}>
              {cause.label}
            </Text>
            <Text style={[styles.causeValue, { color: t.danger }]}>
              {`${formatEuroWhole(cause.amount)}${rate != null ? ` · ${formatRate(rate)}` : ''}`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Nombre d'éléments ajoutés à chaque appui sur « Voir plus ». */
export const SHOW_MORE_STEP = 25;

/** Affichage progressif d'une longue liste dans un `ScrollView` (pas de virtualisation). */
export function useShowMore<T>(items: readonly T[], step = SHOW_MORE_STEP) {
  const [count, setCount] = useState(step);
  return {
    visible: items.slice(0, count),
    hasMore: items.length > count,
    remaining: Math.max(0, items.length - count),
    showMore: () => setCount((current) => current + step),
    reset: () => setCount(step),
  };
}

export function ShowMoreButton({ remaining, onPress }: { remaining: number; onPress: () => void }) {
  return (
    <Button label={`Voir plus (${formatInteger(remaining)})`} variant="ghost" onPress={onPress} />
  );
}

type RowShellProps = {
  children: ReactNode;
  onPress?: () => void;
  label: string;
};

function RowShell({ children, onPress, label }: RowShellProps) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

type FigureProps = { label: string; value: string; color?: string; highlight?: boolean };

function Figure({ label, value, color, highlight }: FigureProps) {
  const styles = useStyles();
  return (
    <View style={[styles.figure, highlight ? styles.highlight : null]}>
      <Text style={styles.caption}>{label}</Text>
      <Text style={[styles.value, color ? { color } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

type ProductRowProps = {
  product: HubBrandMarginProduct;
  view: MarginView;
  /** Détaille l'impact SAV par cause. */
  showSavCauses?: boolean;
};

/** Produit de la marque : désignation, référence, ventes, marge et taux. */
function ProductRowBase({ product, view, showSavCauses = false }: ProductRowProps) {
  const styles = useStyles();
  const t = useTheme();
  const margin = marginOf(product, view);
  const color = marginColor(t, margin.value);
  const siteRate = product.site?.marginRate ?? null;
  return (
    <RowShell
      label={`${product.designation ?? product.reference}, marge ${formatEuroWhole(margin.value)}, taux ${formatRate(margin.rate)}, taux site ${formatRate(siteRate)}`}
    >
      <Text style={styles.title} numberOfLines={2}>
        {product.designation ?? product.reference}
      </Text>
      <Text style={styles.reference} numberOfLines={1}>
        {product.reference}
        {`  ·  ${formatInteger(product.units)} unité${product.units > 1 ? 's' : ''}`}
      </Text>
      <View style={styles.figures}>
        <Figure label="CA HT" value={formatEuroWhole(product.caHT)} />
        <Figure label="Marge" value={formatEuroWhole(margin.value)} color={color} />
        <Figure label="Taux" value={formatRate(margin.rate)} color={color} highlight />
        <Figure
          label="Taux site"
          value={product.site === undefined || product.site === null ? '—' : formatRate(siteRate)}
          color={siteRate != null && siteRate < 0 ? t.danger : t.info}
          highlight
        />
      </View>
      <ProductTraitBadges product={product} />
      {showSavCauses ? <SavCauseLines figures={product} /> : null}
    </RowShell>
  );
}

export const ProductRow = memo(ProductRowBase);

type OrderRowProps = {
  order: HubBrandMarginOrder;
  view: MarginView;
  /** `sav` met l'impact SAV en avant (onglet SAV) ; `margin` la marge (onglet Commandes). */
  mode: 'margin' | 'sav';
  onPress: (reference: string) => void;
};

/** Commande sur le périmètre de la marque : marge, signaux (perte, estimée, lignes à perte) et SAV. */
function OrderRowBase({ order, view, mode, onPress }: OrderRowProps) {
  const styles = useStyles();
  const t = useTheme();
  const margin = marginOf(order, view);
  const color = marginColor(t, margin.value);
  const date = formatDate(order.createdAt);

  return (
    <RowShell
      label={`Commande ${order.reference}, marge ${formatEuroWhole(margin.value)}`}
      onPress={() => onPress(order.reference)}
    >
      <View style={styles.header}>
        <Text style={styles.orderReference} numberOfLines={1}>
          {order.reference}
        </Text>
        <ChevronRight size={16} color={t.textFaint} />
      </View>
      <Text style={styles.reference} numberOfLines={1}>
        {[originLabel(order.origin), date].filter(Boolean).join('  ·  ')}
      </Text>
      <View style={styles.figures}>
        <Figure label="CA HT" value={formatEuroWhole(order.caHT)} />
        <Figure
          label={mode === 'sav' ? 'Impact SAV' : 'Marge'}
          value={formatEuroWhole(mode === 'sav' ? order.sav.totalHT : margin.value)}
          color={mode === 'sav' ? t.warning : color}
        />
        <Figure
          label={mode === 'sav' ? 'Marge' : 'Taux'}
          value={mode === 'sav' ? formatEuroWhole(margin.value) : formatRate(margin.rate)}
          color={color}
        />
      </View>
      {mode === 'sav' ? <SavCauseLines figures={order} /> : null}
      {order.negativeMargin || order.incomplete || order.lossMakingLines > 0 ? (
        <View style={styles.badges}>
          {order.negativeMargin ? <Badge label="Marge négative" tone="red" /> : null}
          {order.lossMakingLines > 0 ? (
            <Badge
              label={`${order.lossMakingLines} ligne${order.lossMakingLines > 1 ? 's' : ''} à perte`}
              tone="red"
            />
          ) : null}
          {order.incomplete ? <Badge label="Marge estimée" tone="amber" /> : null}
        </View>
      ) : null}
    </RowShell>
  );
}

export const OrderRow = memo(OrderRowBase);

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    ...shadow.sm,
  },
  pressed: { opacity: 0.7 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  orderReference: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: t.text,
    fontFamily: monoFontFamily,
  },
  reference: { fontSize: fontSize.xs, color: t.textMuted, fontFamily: monoFontFamily },
  figures: { flexDirection: 'row', gap: spacing.md },
  figure: { flex: 1, gap: 1 },
  // Colonnes de taux de marge (réalisé et actuel) mises en avant.
  highlight: {
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: `${t.accent}26`,
  },
  caption: { fontSize: 11, fontWeight: '600', color: t.textMuted, textTransform: 'uppercase' },
  value: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  causes: { gap: 2 },
  cause: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  causeLabel: { flex: 1, fontSize: fontSize.xs, color: t.textMuted },
  causeValue: { fontSize: fontSize.xs, fontWeight: '600' },
}));
