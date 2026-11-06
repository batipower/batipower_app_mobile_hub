import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Copy, Mail, Phone } from 'lucide-react-native';

import { Badge, DetailSection, Divider, InfoRow } from '@/components/ui';
import { OrderTagBadges } from '@/features/preparation/components/OrderTagBadges';
import { addressLines, recipientName } from '@/features/preparation/orderHelpers';
import { callPhone, composeEmail } from '@/lib/contact';
import { copyToClipboard } from '@/lib/clipboard';
import { formatDateTime, formatEuro, formatRelative, ttcToHT } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, spacing, useTheme } from '@/theme';
import type { HubLogisticsDetail, HubOrder, HubOrderPaymentInfo, HubOrderRow } from '@/types/order';

import {
  orderStatusTone,
  originLabel,
  originTone,
  paymentMethodLabel,
  paymentStatusTone,
} from '../orderDisplay';
import {
  CancellationSection,
  DisputesSection,
  RelatedOrdersSection,
  ReturnLabelsSection,
  ShippingSection,
} from './OrderLogistics';

type OrderDetailProps = {
  data: NonNullable<HubLogisticsDetail['data']>;
  /** Les fiches produit sont réservées aux rôles qui voient le stock (SUPERADMIN, MANAGER). */
  onOpenProduct?: (reference: string) => void;
};

/**
 * Contenu d'une fiche commande, en lecture seule : identité, annulation éventuelle, client,
 * articles, montants, expédition, commandes liées, retours et litiges. Aucune donnée
 * financière interne (marges, prix d'achat) n'est affichée.
 */
export function OrderDetail({ data, onOpenProduct }: OrderDetailProps) {
  const styles = useStyles();
  const { order, paymentInfo, warehouseInfo, relatedOrders, returnLabels, disputes } = data;
  const cancellation = data.latestCancellationRequest;

  return (
    <>
      <HeaderSection order={order} />
      {cancellation ? <CancellationSection request={cancellation} /> : null}
      <CustomerSection order={order} />
      <ArticlesSection rows={order.rows ?? []} onOpenProduct={onOpenProduct} />
      <AmountsSection order={order} paymentInfo={paymentInfo ?? null} />
      <ShippingSection order={order} warehouseInfo={warehouseInfo ?? null} />
      <RelatedOrdersSection orders={relatedOrders ?? []} />
      <ReturnLabelsSection labels={returnLabels ?? []} />
      <DisputesSection disputes={disputes ?? []} />
      <Text style={styles.footnote}>
        Consultation en lecture seule. Les modifications se font depuis l&apos;espace web.
      </Text>
    </>
  );
}

function HeaderSection({ order }: { order: HubOrder }) {
  const styles = useStyles();
  const t = useTheme();
  const created = formatDateTime(order.createdAt);
  const relative = formatRelative(order.createdAt);

  return (
    <DetailSection title="Commande">
      <Pressable
        onPress={() => void copyToClipboard(order.reference, 'Référence')}
        accessibilityRole="button"
        accessibilityLabel={`Référence ${order.reference}`}
        accessibilityHint="Appuyer pour copier"
        hitSlop={10}
        style={styles.referenceRow}
      >
        <Text style={styles.reference}>{order.reference}</Text>
        <Copy size={16} color={t.textSubtle} />
      </Pressable>

      <View style={styles.badges}>
        <Badge label={order.status} tone={orderStatusTone(order.status)} />
        {order.paymentStatus ? (
          <Badge label={order.paymentStatus} tone={paymentStatusTone(order.paymentStatus)} />
        ) : null}
        {order.origin ? (
          <Badge label={originLabel(order.origin)} tone={originTone(order.origin)} />
        ) : null}
      </View>

      {order.ebatRef ? (
        <InfoRow label="Réf. eBat" value={order.ebatRef} mono copyLabel="Réf. eBat" />
      ) : null}
      {created ? (
        <InfoRow label="Créée le" value={relative ? `${created} · ${relative}` : created} />
      ) : null}
      <OrderTagBadges tags={order.warehouseOrder?.tags ?? []} maxCustom={6} />
    </DetailSection>
  );
}

function CustomerSection({ order }: { order: HubOrder }) {
  const styles = useStyles();
  const address = order.deliveryAddress;
  const lines = addressLines(address);
  const phone = address?.phone?.trim() || null;
  const mobile = address?.mobile?.trim() || null;
  const email = order.emailToNotify?.trim() || null;
  const hasContact = !!(phone || mobile || email);

  return (
    <DetailSection title="Client et livraison">
      <Text style={styles.recipient}>{recipientName(address)}</Text>
      {lines.length > 0 ? (
        <View>
          {lines.map((line) => (
            <Text key={line} style={styles.addressLine} selectable>
              {line}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={styles.muted}>Adresse non renseignée.</Text>
      )}

      {hasContact ? (
        <>
          <Divider />
          {phone ? (
            <InfoRow
              label="Téléphone"
              value={phone}
              icon={Phone}
              copyLabel="Téléphone"
              onPress={() => void callPhone(phone)}
              actionHint="Appeler"
            />
          ) : null}
          {mobile && mobile !== phone ? (
            <InfoRow
              label="Mobile"
              value={mobile}
              icon={Phone}
              copyLabel="Mobile"
              onPress={() => void callPhone(mobile)}
              actionHint="Appeler"
            />
          ) : null}
          {email ? (
            <InfoRow
              label="Email"
              value={email}
              icon={Mail}
              copyLabel="Email"
              onPress={() => void composeEmail(email)}
              actionHint="Écrire un email"
            />
          ) : null}
        </>
      ) : null}
    </DetailSection>
  );
}

function lineTotalTTC(row: Pick<HubOrderRow, 'productPrice' | 'quantity'>): number {
  return (row.productPrice ?? 0) * (row.quantity ?? 0);
}

function ArticlesSection({
  rows,
  onOpenProduct,
}: {
  rows: HubOrderRow[];
  onOpenProduct?: (reference: string) => void;
}) {
  const styles = useStyles();
  const pieces = rows.reduce((sum, row) => sum + (row.quantity || 0), 0);

  return (
    <DetailSection
      title={`Articles (${rows.length})`}
      trailing={
        pieces > 0 ? (
          <Text style={styles.count}>
            {pieces} pièce{pieces > 1 ? 's' : ''}
          </Text>
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <Text style={styles.muted}>Aucun article.</Text>
      ) : (
        rows.map((row, index) => (
          <ArticleRow
            key={row.uuid ?? `${row.reference}-${index}`}
            row={row}
            first={index === 0}
            onOpen={onOpenProduct ? () => onOpenProduct(row.reference) : undefined}
          />
        ))
      )}
    </DetailSection>
  );
}

function ArticleRow({
  row,
  first,
  onOpen,
}: {
  row: HubOrderRow;
  first: boolean;
  onOpen?: () => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  const content = (
    <>
      <Text style={styles.quantity}>{row.quantity}×</Text>
      <View style={styles.articleBody}>
        <Text style={styles.articleRef}>{row.reference}</Text>
        {row.name ? <Text style={styles.articleName}>{row.name}</Text> : null}
      </View>
      <View style={styles.articleAmounts}>
        <Text style={styles.articleTotal}>{formatEuro(lineTotalTTC(row))}</Text>
        {row.quantity > 1 ? (
          <Text style={styles.articleUnit}>{formatEuro(row.productPrice)} l&apos;unité</Text>
        ) : null}
      </View>
      {onOpen ? <ChevronRight size={16} color={t.textFaint} /> : null}
    </>
  );

  const style = [styles.article, !first && styles.articleBorder];

  if (!onOpen) return <View style={style}>{content}</View>;

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${row.quantity} fois ${row.reference}${row.name ? `, ${row.name}` : ''}`}
      accessibilityHint="Ouvrir la fiche produit"
      style={({ pressed }) => [style, pressed && styles.articlePressed]}
    >
      {content}
    </Pressable>
  );
}

function AmountsSection({
  order,
  paymentInfo,
}: {
  order: HubOrder;
  paymentInfo: HubOrderPaymentInfo | null;
}) {
  const styles = useStyles();
  const productsTTC = (order.rows ?? []).reduce((sum, row) => sum + lineTotalTTC(row), 0);
  const shippingTTC = order.totalShipping ?? 0;
  const paidTTC = order.totalPaid ?? productsTTC + shippingTTC;

  const method = paymentMethodLabel(paymentInfo);
  const paidAt = formatDateTime(paymentInfo?.payment.paidAt);
  const promo = paymentInfo?.promo?.used ? paymentInfo.promo : null;
  const promoValue = promo
    ? [promo.code, promo.discountTTC ? `−${formatEuro(promo.discountTTC)}` : null]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <DetailSection title="Montants">
      <View style={styles.amountHeader}>
        <Text style={styles.amountLabel} />
        <Text style={[styles.amountColumn, styles.amountColumnTitle]}>HT</Text>
        <Text style={[styles.amountColumn, styles.amountColumnTitle]}>TTC</Text>
      </View>
      <AmountRow label="Produits" ttc={productsTTC} />
      <AmountRow label="Livraison" ttc={shippingTTC} />
      <Divider />
      <AmountRow label="Total" ttc={paidTTC} strong />

      {method || paidAt || promoValue || promo?.freeShipping ? <Divider /> : null}
      {method ? <InfoRow label="Paiement" value={method} /> : null}
      {paidAt ? <InfoRow label="Payée le" value={paidAt} /> : null}
      {promo ? (
        <InfoRow label="Code promo" value={promoValue || 'Appliqué'} mono={!!promo.code} />
      ) : null}
      {promo?.freeShipping ? <InfoRow label="Livraison" value="Offerte" /> : null}
    </DetailSection>
  );
}

function AmountRow({
  label,
  ttc,
  strong = false,
}: {
  label: string;
  ttc: number;
  strong?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={styles.amountRow}>
      <Text style={[styles.amountLabel, strong && styles.amountStrongLabel]}>{label}</Text>
      <Text style={[styles.amountColumn, styles.amountHT]}>{formatEuro(ttcToHT(ttc))}</Text>
      <Text style={[styles.amountColumn, strong ? styles.amountStrong : styles.amountTTC]}>
        {formatEuro(ttc)}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  referenceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reference: {
    flexShrink: 1,
    fontFamily: monoFontFamily,
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: t.text,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  recipient: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  addressLine: { fontSize: fontSize.sm, lineHeight: 20, color: t.textMuted },
  muted: { fontSize: fontSize.sm, color: t.textSubtle },
  count: { fontSize: fontSize.xs, fontWeight: '600', color: t.textMuted },

  article: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  articleBorder: {
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: t.border,
  },
  articlePressed: { opacity: 0.6 },
  quantity: { minWidth: 32, fontSize: fontSize.base, fontWeight: '800', color: t.text },
  articleBody: { flex: 1, gap: 2 },
  articleRef: {
    fontFamily: monoFontFamily,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: t.accentText,
  },
  articleName: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  articleAmounts: { alignItems: 'flex-end', gap: 2 },
  articleTotal: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: t.text,
    fontVariant: ['tabular-nums'],
  },
  articleUnit: { fontSize: 11, color: t.textSubtle, fontVariant: ['tabular-nums'] },

  amountHeader: { flexDirection: 'row', alignItems: 'center' },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  amountLabel: { flex: 1, fontSize: fontSize.sm, color: t.textMuted },
  amountStrongLabel: { fontWeight: '700', color: t.text },
  amountColumn: { width: 96, textAlign: 'right', fontVariant: ['tabular-nums'] },
  amountColumnTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: t.textSubtle,
  },
  amountHT: { fontSize: fontSize.xs, color: t.textSubtle },
  amountTTC: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  amountStrong: { fontSize: fontSize.base, fontWeight: '800', color: t.accentText },

  footnote: {
    paddingHorizontal: spacing.lg,
    textAlign: 'center',
    fontSize: fontSize.xs,
    lineHeight: 17,
    color: t.textFaint,
  },
}));
