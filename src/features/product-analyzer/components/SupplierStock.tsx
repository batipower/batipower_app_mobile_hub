import { Text, View } from 'react-native';

import { formatInteger } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { AgencyStockDetail, StagingDistributorOfferView } from '@/types/hubProductAnalyzer';

import { SR_CFG } from '../lib/constants';
import { agencyDisplayName } from '../lib/helpers';

/** Offres portant une donnée de stock (les autres n'apprennent rien sur l'endroit où est le stock). */
export function offersWithStock(offers: StagingDistributorOfferView[] | undefined): StagingDistributorOfferView[] {
  return (offers ?? []).filter((o) => o.stockReadiness != null || o.stockWarehouse != null || o.stockTotal != null);
}

/**
 * Nom du fournisseur ; quand il porte plusieurs offres (un code par entrepôt), le nom de
 * l'entrepôt est ajouté pour les distinguer.
 */
export function offerLabel(o: StagingDistributorOfferView, siblings?: StagingDistributorOfferView[]): string {
  const name = o.distributor?.name ?? o.warehouse ?? 'Fournisseur';
  const warehouseName = o.distributorWarehouse?.name;
  if (!warehouseName || !siblings) return name;
  return siblings.filter((s) => s.distributorId === o.distributorId).length > 1 ? `${name} · ${warehouseName}` : name;
}

const sumQty = (list: AgencyStockDetail[] | null | undefined) => (list ?? []).reduce((s, a) => s + (a.quantity || 0), 0);

const MAX_LINES = 4;

/**
 * Stock par fournisseur sous le badge de disponibilité : une ligne compacte par offre (pastille de
 * disponibilité, nom, quantité en entrepôt). Les fournisseurs filtrés sont mis en avant.
 */
export function SupplierStockLines({
  offers,
  highlightIds,
}: {
  offers: StagingDistributorOfferView[];
  highlightIds: string[];
}) {
  const styles = useStyles();
  const t = useTheme();
  if (offers.length === 0) return null;
  // Les fournisseurs filtrés d'abord, pour qu'ils ne soient jamais coupés.
  const sorted = [...offers].sort(
    (a, b) => Number(highlightIds.includes(b.distributorId)) - Number(highlightIds.includes(a.distributorId)),
  );
  const shown = sorted.slice(0, MAX_LINES);
  return (
    <View style={styles.lines} accessibilityLabel="Stock par fournisseur">
      {shown.map((o) => {
        const cfg = o.stockReadiness ? SR_CFG[o.stockReadiness] : null;
        const highlighted = highlightIds.includes(o.distributorId);
        const wh = o.stockWarehouse ?? 0;
        return (
          <View key={o.uuid} style={[styles.line, highlighted && { backgroundColor: withAlpha(t.success, 0.14) }]}>
            <View style={[styles.dot, { backgroundColor: cfg?.color ?? t.textFaint }]} />
            <Text style={[styles.name, highlighted && { fontWeight: '800', color: t.text }]} numberOfLines={1}>
              {offerLabel(o, offers)}
            </Text>
            <Text style={[styles.qty, { color: wh > 0 ? t.success : t.textFaint }]}>
              {o.stockWarehouse != null ? formatInteger(o.stockWarehouse) : '—'}
            </Text>
          </View>
        );
      })}
      {sorted.length > shown.length ? (
        <Text style={styles.more}>+ {sorted.length - shown.length} autre{sorted.length - shown.length > 1 ? 's' : ''} fournisseur{sorted.length - shown.length > 1 ? 's' : ''}</Text>
      ) : null}
    </View>
  );
}

/** Détail du stock de chaque fournisseur : entrepôt, total, agences proches (J+1) et autres agences. */
export function SupplierStockDetail({
  offers,
  itemWarehouse,
}: {
  offers: StagingDistributorOfferView[];
  itemWarehouse: string;
}) {
  const styles = useStyles();
  const t = useTheme();
  if (offers.length === 0) return null;
  return (
    <View style={styles.detail}>
      <Text style={styles.header}>Par fournisseur</Text>
      {offers.map((o) => {
        const cfg = o.stockReadiness ? SR_CFG[o.stockReadiness] : null;
        const nearby = o.agencyStock?.nearby ?? [];
        const other = o.agencyStock?.other ?? [];
        const wh = o.warehouse ?? itemWarehouse;
        return (
          <View key={o.uuid} style={styles.offer}>
            <View style={styles.offerHead}>
              <View style={[styles.dot, { backgroundColor: cfg?.color ?? t.textFaint }]} />
              <Text style={styles.offerName} numberOfLines={1}>
                {offerLabel(o, offers)}
              </Text>
              <Text style={styles.offerQty}>
                Entrepôt <Text style={styles.strong}>{o.stockWarehouse != null ? formatInteger(o.stockWarehouse) : '—'}</Text>
                {o.stockTotal != null ? (
                  <>
                    {' · '}Total <Text style={styles.strong}>{formatInteger(o.stockTotal)}</Text>
                  </>
                ) : null}
              </Text>
            </View>
            {sumQty(nearby) > 0 ? (
              <View style={styles.agencyRow}>
                <Text style={[styles.agencyText, { color: t.warning }]}>
                  Proches J+1 : {nearby.map((a) => `${agencyDisplayName(a, wh)} ${a.quantity}`).join(', ')}
                </Text>
                <Text style={[styles.agencySum, { color: t.warning }]}>{formatInteger(sumQty(nearby))}</Text>
              </View>
            ) : null}
            {sumQty(other) > 0 ? (
              <View style={styles.agencyRow}>
                <Text style={[styles.agencyText, { color: '#EA580C' }]}>
                  Autres : {other.map((a) => `${agencyDisplayName(a, wh)} ${a.quantity}`).join(', ')}
                </Text>
                <Text style={[styles.agencySum, { color: '#EA580C' }]}>{formatInteger(sumQty(other))}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  lines: { gap: 1, alignSelf: 'stretch' },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, borderRadius: radius.sm, paddingHorizontal: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  name: { flex: 1, fontSize: 11, color: t.textMuted },
  qty: { fontSize: 11, fontWeight: '800' },
  more: { fontSize: 10, color: t.textSubtle, paddingHorizontal: 3 },
  detail: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: t.border, paddingTop: spacing.sm },
  header: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', color: t.textSubtle },
  offer: { gap: 2 },
  offerHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  offerName: { flex: 1, fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  offerQty: { fontSize: fontSize.xs, color: t.textMuted },
  strong: { fontWeight: '800', color: t.text },
  agencyRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, paddingLeft: spacing.md },
  agencyText: { flex: 1, fontSize: fontSize.xs },
  agencySum: { fontSize: fontSize.xs, fontWeight: '800' },
}));
