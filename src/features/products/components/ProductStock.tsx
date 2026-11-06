import { StyleSheet, Text, View } from 'react-native';

import { DetailSection, Divider } from '@/components/ui';
import { warehouseLabel } from '@/features/orders/orderDisplay';
import { ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { formatDate, formatInteger } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, withAlpha } from '@/theme';
import type { HubProductHeader, HubProductStock, HubWarehouseStock } from '@/types/product';

import { groupAgencies } from '../productDisplay';

type ProductStockProps = {
  header: HubProductHeader;
  /** Stock détaillé ; absent tant qu'il charge ou s'il est en erreur. */
  stock: HubProductStock | null;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
};

/**
 * Stock du produit : entrepôts (QG, Flevy, Dombasle), agences groupées par priorité de
 * rapatriement et commandes fournisseur de la semaine. Les cartes d'entrepôt s'affichent
 * tout de suite avec le stock résumé de l'en-tête, puis se complètent (dates d'inventaire).
 */
export function ProductStock({ header, stock, loading, error, onRetry }: ProductStockProps) {
  const styles = useStyles();
  const warehouses = stock?.warehouses ?? {
    qg: { stock: header.stock.qg },
    flevy: { stock: header.stock.flevy },
    dombasle: { stock: header.stock.dombasle },
  };
  const total =
    (warehouses.qg.stock ?? 0) + (warehouses.flevy.stock ?? 0) + (warehouses.dombasle.stock ?? 0);
  const agencyGroups = groupAgencies(stock?.agencies ?? []);

  return (
    <>
      <DetailSection
        title="Stock"
        trailing={<Text style={styles.total}>Total {formatInteger(total)} u</Text>}
      >
        <View style={styles.cards}>
          <WarehouseCard label="QG" warehouse={warehouses.qg} />
          <WarehouseCard label="Flevy" warehouse={warehouses.flevy} />
          <WarehouseCard label="Dombasle" warehouse={warehouses.dombasle} />
        </View>
        {error ? (
          <ErrorBanner
            error={error}
            fallback="Impossible de charger le détail du stock"
            onRetry={onRetry}
          />
        ) : null}
      </DetailSection>

      {loading ? <ListSkeleton rows={1} height={112} /> : null}

      {agencyGroups.length > 0 ? (
        <DetailSection title="Stock agences">
          <Text style={styles.hint}>
            Stock au dernier inventaire eBatPro, hors entrepôts principaux Dombasle et Flevy.
          </Text>
          {agencyGroups.map((group, index) => (
            <View key={group.id} style={styles.group}>
              {index > 0 ? <Divider /> : null}
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                <Text style={styles.groupTotal}>{formatInteger(group.total)} u</Text>
              </View>
              <Text style={[styles.inventory, group.stale && styles.inventoryStale]}>
                {group.inventoryAt
                  ? `Inventaire ${formatDate(group.inventoryAt.toISOString())}${group.stale ? ' (périmé)' : ''}`
                  : 'Inventaire inconnu'}
              </Text>
              {group.chips.length > 0 ? (
                <View style={styles.chips}>
                  {group.chips.map((chip) => (
                    <View
                      key={`${chip.parentWarehouse}:${chip.code}`}
                      style={[styles.chip, chip.stock <= 0 && styles.chipEmpty]}
                      accessible
                      accessibilityLabel={`${chip.name} : ${chip.stock} unités`}
                    >
                      <Text style={[styles.chipName, chip.stock <= 0 && styles.chipTextEmpty]}>
                        {chip.name}
                      </Text>
                      <Text style={[styles.chipStock, chip.stock <= 0 && styles.chipTextEmpty]}>
                        {formatInteger(chip.stock)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.hint}>Aucun stock dans ces agences.</Text>
              )}
            </View>
          ))}
        </DetailSection>
      ) : null}

      {stock ? (
        <DetailSection
          title="Commandes fournisseur"
          trailing={
            stock.supplierOrdersWeekLabel ? (
              <Text style={styles.total}>Semaine {stock.supplierOrdersWeekLabel}</Text>
            ) : undefined
          }
        >
          {stock.supplierOrders.length === 0 ? (
            <Text style={styles.hint}>Aucune commande cette semaine.</Text>
          ) : (
            stock.supplierOrders.map((order, index) => (
              <View key={order.id} style={[styles.supplier, index > 0 && styles.supplierBorder]}>
                <View style={styles.supplierMain}>
                  <Text style={styles.supplierWarehouse}>{warehouseLabel(order.warehouse)}</Text>
                  <Text style={styles.hint}>
                    {order.commandeFournisseur ? 'Commandé' : 'Non commandé'}
                    {order.dateLivraisonPrevue
                      ? `  ·  livraison prévue le ${formatDate(order.dateLivraisonPrevue) ?? '—'}`
                      : ''}
                  </Text>
                </View>
                <Text style={styles.supplierQty}>
                  {order.quantiteCommandee == null
                    ? '—'
                    : `${formatInteger(order.quantiteCommandee)} u`}
                </Text>
              </View>
            ))
          )}
        </DetailSection>
      ) : null}
    </>
  );
}

function WarehouseCard({ label, warehouse }: { label: string; warehouse: HubWarehouseStock }) {
  const styles = useStyles();
  const quantity = warehouse.stock;
  const empty = (quantity ?? 0) <= 0;
  const inventory = formatDate(warehouse.lastInventoryAt);
  const failed = warehouse.lastInventorySuccess === false;

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${label} : ${quantity == null ? 'stock inconnu' : `${quantity} unités`}${
        inventory ? `, inventaire du ${inventory}` : ''
      }`}
    >
      <Text style={styles.cardLabel}>{label}</Text>
      <Text
        style={[styles.cardQuantity, empty && styles.cardQuantityEmpty]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {quantity == null ? '—' : formatInteger(quantity)}
      </Text>
      {inventory ? (
        <Text style={[styles.cardMeta, failed && styles.cardMetaFailed]} numberOfLines={2}>
          {failed ? '⚠ ' : ''}Inv. {inventory}
        </Text>
      ) : null}
      {warehouse.depreciated ? <Text style={styles.cardMeta}>Déprécié</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  total: { fontSize: fontSize.xs, fontWeight: '700', color: t.textMuted },
  hint: { fontSize: fontSize.xs, lineHeight: 17, color: t.textSubtle },
  cards: { flexDirection: 'row', gap: spacing.sm },
  card: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: t.surface,
  },
  cardLabel: { fontSize: fontSize.xs, fontWeight: '600', color: t.textMuted },
  cardQuantity: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: t.accentText,
    fontVariant: ['tabular-nums'],
  },
  cardQuantityEmpty: { color: t.danger },
  cardMeta: { fontSize: 11, textAlign: 'center', color: t.textSubtle },
  cardMetaFailed: { color: t.warning },

  group: { gap: spacing.sm },
  groupHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  groupTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: t.text,
  },
  groupTotal: { fontSize: fontSize.sm, fontWeight: '700', color: t.textMuted },
  inventory: { fontSize: fontSize.xs, color: t.textSubtle },
  inventoryStale: { fontWeight: '600', color: t.danger },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    backgroundColor: withAlpha(t.accent, 0.14),
  },
  chipEmpty: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderStyle: 'dashed',
    borderColor: t.borderStrong,
  },
  chipName: { fontSize: fontSize.xs, fontWeight: '500', color: t.text },
  chipStock: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: t.accentText,
    fontVariant: ['tabular-nums'],
  },
  chipTextEmpty: { color: t.textFaint },

  supplier: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  supplierBorder: {
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: t.border,
  },
  supplierMain: { flex: 1, gap: 2 },
  supplierWarehouse: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  supplierQty: {
    fontSize: fontSize.base,
    fontWeight: '800',
    color: t.text,
    fontVariant: ['tabular-nums'],
  },
}));
