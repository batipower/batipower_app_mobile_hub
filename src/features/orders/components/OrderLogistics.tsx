import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, ExternalLink } from 'lucide-react-native';

import { Badge, DetailSection, InfoRow } from '@/components/ui';
import { openOrder } from '@/features/search/navigation';
import { copyToClipboard } from '@/lib/clipboard';
import { formatDate, formatDateTime, formatEuro } from '@/lib/format';
import { openExternalUrl } from '@/lib/openWeb';
import { fontSize, makeStyles, monoFontFamily, spacing, useTheme } from '@/theme';
import type {
  HubCancellationRequest,
  HubCarrierDispute,
  HubOrder,
  HubRelatedOrder,
  HubReturnLabel,
  HubWarehouseInfo,
} from '@/types/order';

import { buildCarrierTrackingUrl } from '../carrierTracking';
import {
  cancellationLabel,
  disputeStatusLabel,
  disputeStatusTone,
  orderStatusTone,
  relatedKindLabel,
  returnLabelStatusLabel,
  returnLabelStatusTone,
  warehouseLabel,
  warehouseOrderStatusLabel,
} from '../orderDisplay';

// ─── Annulation ──────────────────────────────────────────────────────────────

export function CancellationSection({ request }: { request: HubCancellationRequest }) {
  const styles = useStyles();
  const tone =
    request.status === 'PENDING' ? 'amber' : request.status === 'APPROVED' ? 'red' : 'neutral';
  const requested = formatDateTime(request.requestedAt);

  return (
    <DetailSection title="Demande d'annulation">
      <Badge label={cancellationLabel(request.status)} tone={tone} />
      {request.reason ? (
        <Text style={styles.body} selectable>
          {request.reason}
        </Text>
      ) : null}
      {requested ? <Text style={styles.meta}>Demandée le {requested}</Text> : null}
    </DetailSection>
  );
}

// ─── Expédition ──────────────────────────────────────────────────────────────

type ShippingSectionProps = {
  order: HubOrder;
  warehouseInfo: HubWarehouseInfo | null;
};

export function ShippingSection({ order, warehouseInfo }: ShippingSectionProps) {
  const warehouseOrder = order.warehouseOrder;
  const warehouse =
    warehouseInfo?.label?.trim() || warehouseLabel(warehouseOrder?.warehouseAffectation);
  const carrier = order.carrier?.name?.trim() || null;
  const tracking = warehouseOrder?.noSuivi?.trim() || null;
  const trackingUrl = buildCarrierTrackingUrl(carrier, tracking);

  const dates = [
    { label: 'Expédiée le', value: formatDateTime(order.dateExpedie ?? order.shippedAt) },
    { label: 'Collectée le', value: formatDateTime(order.dateCollect) },
    { label: 'Livrée le', value: formatDateTime(order.dateDelivery ?? order.deliveredAt) },
  ].filter((item): item is { label: string; value: string } => !!item.value);

  return (
    <DetailSection title="Expédition">
      <InfoRow label="Entrepôt" value={warehouse} />
      {warehouseInfo?.distributorName ? (
        <InfoRow label="Distributeur" value={warehouseInfo.distributorName} />
      ) : null}
      <InfoRow label="Transporteur" value={carrier ?? '—'} />
      {warehouseOrder ? (
        <>
          <InfoRow
            label="Statut entrepôt"
            value={warehouseOrderStatusLabel(warehouseOrder.status)}
          />
          <InfoRow
            label="Statut livraison"
            value={warehouseOrderStatusLabel(warehouseOrder.deliveryOrderStatus)}
          />
        </>
      ) : null}
      {tracking ? (
        <InfoRow
          label="N° de suivi"
          value={tracking}
          mono
          copyLabel="N° de suivi"
          icon={ExternalLink}
          onPress={trackingUrl ? () => void openExternalUrl(trackingUrl) : undefined}
          actionHint="Ouvrir le suivi du transporteur"
        />
      ) : null}
      {dates.map((item) => (
        <InfoRow key={item.label} label={item.label} value={item.value} />
      ))}
    </DetailSection>
  );
}

// ─── Commandes liées ─────────────────────────────────────────────────────────

export function RelatedOrdersSection({ orders }: { orders: HubRelatedOrder[] }) {
  // La liste contient la commande courante : sans autre commande, rien à montrer.
  if (orders.length < 2) return null;

  return (
    <DetailSection title={`Commandes liées (${orders.length - 1})`}>
      {orders.map((related, index) => (
        <RelatedRow key={related.reference} related={related} first={index === 0} />
      ))}
    </DetailSection>
  );
}

function RelatedRow({ related, first }: { related: HubRelatedOrder; first: boolean }) {
  const styles = useStyles();
  const t = useTheme();
  const meta = [
    related.carrierName,
    related.noSuivi,
    related.totalPaid != null ? formatEuro(related.totalPaid) : null,
    formatDate(related.createdAt),
  ]
    .filter(Boolean)
    .join('  ·  ');

  const content = (
    <>
      <View style={styles.itemHeader}>
        <Text
          style={[styles.itemTitle, related.isCurrent && styles.itemTitleCurrent]}
          numberOfLines={1}
        >
          {related.reference}
        </Text>
        {related.isCurrent ? (
          <Badge label="Actuelle" tone="green" />
        ) : (
          <Badge label={relatedKindLabel(related.kind)} tone="purple" />
        )}
        {related.isCurrent ? null : (
          <ChevronRight size={16} color={t.textFaint} style={styles.chevron} />
        )}
      </View>
      <View style={styles.itemHeader}>
        <Badge label={related.status} tone={orderStatusTone(related.status)} />
      </View>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </>
  );

  const style = [
    styles.item,
    !first && styles.itemBorder,
    // Arbre de split : on décale les commandes enfants (3 niveaux maximum).
    { paddingLeft: Math.min(related.depth, 3) * spacing.md },
  ];

  if (related.isCurrent) return <View style={style}>{content}</View>;

  return (
    <Pressable
      onPress={() => openOrder(related.reference)}
      accessibilityRole="button"
      accessibilityLabel={`Commande liée ${related.reference}, ${relatedKindLabel(related.kind)}, ${related.status}`}
      style={({ pressed }) => [style, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

// ─── Retours ─────────────────────────────────────────────────────────────────

export function ReturnLabelsSection({ labels }: { labels: HubReturnLabel[] }) {
  const styles = useStyles();
  if (labels.length === 0) return null;

  return (
    <DetailSection title={`Retours (${labels.length})`}>
      {labels.map((label, index) => (
        <ItemBlock key={label.uuid} first={index === 0}>
          <Pressable
            onPress={() => void copyToClipboard(label.noSuivi, 'N° de suivi retour')}
            accessibilityRole="button"
            accessibilityLabel={`Suivi retour ${label.noSuivi}`}
            accessibilityHint="Appuyer pour copier"
            hitSlop={10}
            style={styles.itemHeader}
          >
            <Text style={styles.itemTitle} numberOfLines={1}>
              {label.noSuivi}
            </Text>
            <Badge
              label={returnLabelStatusLabel(label.status)}
              tone={returnLabelStatusTone(label.status)}
            />
          </Pressable>
          <Text style={styles.meta}>
            {[
              label.parcelCount > 1 ? `Colis ${label.parcelIndex}/${label.parcelCount}` : null,
              formatDate(label.createdAt),
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </Text>
        </ItemBlock>
      ))}
    </DetailSection>
  );
}

// ─── Litiges transporteur ────────────────────────────────────────────────────

export function DisputesSection({ disputes }: { disputes: HubCarrierDispute[] }) {
  const styles = useStyles();
  if (disputes.length === 0) return null;

  return (
    <DetailSection title={`Litiges transporteur (${disputes.length})`}>
      {disputes.map((dispute, index) => {
        const resolved = formatDate(dispute.resolvedAt);
        return (
          <ItemBlock key={dispute.uuid} first={index === 0}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle} numberOfLines={1}>
                {dispute.ticketReference}
              </Text>
              <Badge
                label={disputeStatusLabel(dispute.status)}
                tone={disputeStatusTone(dispute.status)}
              />
            </View>
            {dispute.comment ? (
              <Text style={styles.body} selectable>
                {dispute.comment}
              </Text>
            ) : null}
            <Text style={styles.meta}>
              {[
                dispute.carrier,
                `Ouvert le ${formatDate(dispute.createdAt) ?? '—'}`,
                resolved ? `Résolu le ${resolved}` : null,
              ]
                .filter(Boolean)
                .join('  ·  ')}
            </Text>
          </ItemBlock>
        );
      })}
    </DetailSection>
  );
}

function ItemBlock({ first, children }: { first: boolean; children: ReactNode }) {
  const styles = useStyles();
  return <View style={[styles.item, !first && styles.itemBorder]}>{children}</View>;
}

const useStyles = makeStyles((t) => ({
  body: { fontSize: fontSize.sm, lineHeight: 20, color: t.textMuted },
  meta: { fontSize: fontSize.xs, lineHeight: 17, color: t.textSubtle },
  item: { gap: spacing.sm },
  itemBorder: {
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: t.border,
  },
  pressed: { opacity: 0.6 },
  chevron: { marginLeft: 'auto' },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemTitle: {
    flexShrink: 1,
    fontFamily: monoFontFamily,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: t.text,
  },
  itemTitleCurrent: { color: t.accentText },
}));
