import { Text, View } from 'react-native';

import { Badge, DetailSection, Divider, InfoRow } from '@/components/ui';
import { warehouseLabel } from '@/features/pricing/options';
import { formatDate, formatDateTime, formatEuro, formatRelative } from '@/lib/format';
import { fontSize, makeStyles, spacing } from '@/theme';
import type { HubPalletQuote } from '@/types/hubPalletFlow';
import type { HubOrder } from '@/types/order';

import { palletFlowStatusView, quoteStatusLabel, quoteStatusTone } from '../display';

type Props = {
  order: HubOrder;
  quotes: HubPalletQuote[];
};

/** Statut du flux palette de la commande, entrepôt naturel et devis palette déjà demandés. */
export function PalletStatusSection({ order, quotes }: Props) {
  const styles = useStyles();
  const status = palletFlowStatusView(order.palletFlowStatus);
  const deadline = quotes.find((q) => q.status === 'PENDING' || q.status === 'ANSWERED');

  return (
    <DetailSection title="Flux palette">
      <View style={styles.badges}>
        <Badge label={status.label} tone={status.tone} />
      </View>
      {order.palletNaturalWarehouse ? (
        <InfoRow label="Entrepôt d'origine" value={warehouseLabel(order.palletNaturalWarehouse)} />
      ) : null}
      {deadline?.expiresAt ? (
        <Text style={styles.warning}>
          Sans décision, retour au flux classique le {formatDate(deadline.expiresAt)}.
        </Text>
      ) : null}

      {quotes.length > 0 ? (
        <>
          <Divider />
          {quotes.map((quote) => (
            <View key={quote.uuid} style={styles.quote}>
              <View style={styles.quoteHeader}>
                <Badge label={quoteStatusLabel(quote.status)} tone={quoteStatusTone(quote.status)} />
                {quote.quotedPriceHT != null ? (
                  <Text style={styles.price}>{formatEuro(quote.quotedPriceHT)} HT</Text>
                ) : null}
              </View>
              <Text style={styles.meta}>
                {warehouseLabel(quote.warehouse)} · {(quote.totalWeightGrams / 1000).toFixed(1)} kg
                {quote.leadTimeDays != null ? ` · délai ${quote.leadTimeDays} j` : ''}
              </Text>
              <Text style={styles.meta}>
                Demandé le {formatDateTime(quote.sentAt ?? quote.createdAt)}
                {formatRelative(quote.sentAt ?? quote.createdAt)
                  ? ` · ${formatRelative(quote.sentAt ?? quote.createdAt)}`
                  : ''}
              </Text>
              {quote.responderComment ? (
                <Text style={styles.meta}>Dépôt : {quote.responderComment}</Text>
              ) : null}
            </View>
          ))}
        </>
      ) : null}
    </DetailSection>
  );
}

const useStyles = makeStyles((t) => ({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  warning: { fontSize: fontSize.xs, lineHeight: 17, color: t.warning },
  quote: { gap: 2 },
  quoteHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  price: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  meta: { fontSize: fontSize.xs, color: t.textMuted },
}));
