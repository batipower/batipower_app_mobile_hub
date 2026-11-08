import { Alert, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ban, CheckCircle2, PackageCheck, RotateCcw } from 'lucide-react-native';

import { Badge, Button, DetailSection, InfoRow } from '@/components/ui';
import { formatDate, formatDateTime, formatInteger } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, radius, spacing, useTheme } from '@/theme';
import {
  INTER_AGENCY_REASON_LABELS,
  type InterAgencyOrder,
} from '@/types/partnerInterAgency';

import {
  openInterAgencyConversation,
  openInterAgencyDone,
  openInterAgencyImpossible,
} from '../navigation';
import { warehouseLabel } from '../products/constants';
import { ConversationLink } from '../shared/ConversationLink';
import { DetailScroll } from '../shared/DetailScroll';
import { INTER_AGENCY_STATUS_META } from './constants';
import { useInterAgencyActions } from './hooks/useInterAgencyActions';
import { useInterAgencyOrder } from './hooks/useInterAgencyOrder';
import { ageLabel, daysSince, interAgencyStatus, orderLabel } from './lib';

/**
 * Fiche d'une commande inter-agence : lignes, stock des agences conseillées, acheteurs, suivi des
 * agences prévenues et déclaration impossible, avec les actions du web (réalisée, pré-réception,
 * impossible d'honorer) et l'accès aux fils logistique et HUB.
 */
export function InterAgencyDetailScreen() {
  const { reference, warehouse } = useLocalSearchParams<{ reference: string; warehouse?: string }>();
  const { order, loading, error, notFound, refetch } = useInterAgencyOrder(reference);

  return (
    <>
      <Stack.Screen options={{ title: order ? orderLabel(order) : 'Commande' }} />
      <DetailScroll
        loading={loading}
        error={error}
        notFound={notFound}
        notFoundTitle="Commande introuvable"
        notFoundText="Cette commande a été expédiée, collectée ou livrée : elle n'est plus à traiter."
        errorFallback="Impossible de charger la commande"
        refetch={refetch}
      >
        {order ? <OrderContent order={order} warehouse={warehouse ?? order.warehouseAffectation ?? ''} /> : null}
      </DetailScroll>
    </>
  );
}

function OrderContent({ order, warehouse }: { order: InterAgencyOrder; warehouse: string }) {
  const styles = useStyles();
  const t = useTheme();
  const { toggle, setImpossible } = useInterAgencyActions(order.reference, warehouse);
  const status = INTER_AGENCY_STATUS_META[interAgencyStatus(order)];
  const days = daysSince(order.createdAt);
  const busy = toggle.isPending || setImpossible.isPending;

  const confirm = (title: string, message: string, onConfirm: () => void) =>
    Alert.alert(title, message, [
      { text: 'Retour', style: 'cancel' },
      { text: 'Confirmer', style: 'destructive', onPress: onConfirm },
    ]);

  const missingWarehouse = !warehouse;
  const showHub = order.interAgencyImpossible || order.hubConversation.messageCount > 0;

  return (
    <>
      <View style={styles.hero}>
        <Text style={styles.reference}>{orderLabel(order)}</Text>
        {order.ebatRef ? <Text style={styles.sub}>Boutique : {order.reference}</Text> : null}
        <View style={styles.badges}>
          <Badge label={status.label} tone={status.tone} />
          {order.interAgencyPreReceived ? <Badge label="Pré-réception" tone="blue" /> : null}
          {order.warehouseAffectation ? (
            <Badge label={warehouseLabel(order.warehouseAffectation)} tone="neutral" />
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        {missingWarehouse ? (
          <Text style={styles.warning}>
            Entrepôt manquant sur cette commande : elle ne peut pas être validée depuis l&apos;app.
          </Text>
        ) : null}

        {order.interAgencyDone ? (
          <Button
            label="Annuler la réalisation"
            variant="outline"
            disabled={busy || missingWarehouse}
            loading={toggle.isPending && toggle.variables?.field === 'interAgencyDone'}
            leadingIcon={<RotateCcw size={16} color={t.text} />}
            onPress={() =>
              confirm(
                'Annuler la réalisation ?',
                "Le suivi des agences (e-mail lu, bien traitée) sera effacé. Les agences ne sont pas prévenues de cette annulation.",
                () => toggle.mutate({ field: 'interAgencyDone', value: false }),
              )
            }
          />
        ) : !order.interAgencyImpossible ? (
          <Button
            label="Marquer réalisée"
            disabled={busy || missingWarehouse}
            leadingIcon={<CheckCircle2 size={16} color={t.onAccent} />}
            onPress={() => openInterAgencyDone(order.reference, warehouse)}
          />
        ) : null}

        <Button
          label={order.interAgencyPreReceived ? 'Annuler la pré-réception' : 'Signaler la pré-réception'}
          variant="outline"
          disabled={busy || missingWarehouse || order.interAgencyImpossible}
          loading={toggle.isPending && toggle.variables?.field === 'interAgencyPreReceived'}
          leadingIcon={<PackageCheck size={16} color={t.text} />}
          onPress={() =>
            toggle.mutate({
              field: 'interAgencyPreReceived',
              value: !order.interAgencyPreReceived,
            })
          }
        />

        {order.interAgencyImpossible ? (
          <Button
            label="Annuler l'impossibilité"
            variant="outline"
            destructive
            disabled={busy}
            loading={setImpossible.isPending}
            leadingIcon={<RotateCcw size={16} color={t.danger} />}
            onPress={() =>
              confirm(
                "Annuler l'impossibilité ?",
                order.customerNotifiedAt
                  ? "Le client a déjà été prévenu de cette impossibilité. Annuler remet l'inter-agence dans le circuit normal et efface ce suivi."
                  : "L'inter-agence repart dans le circuit normal.",
                () => setImpossible.mutate({ value: false }),
              )
            }
          />
        ) : !order.interAgencyDone ? (
          <Button
            label="Impossible d'honorer"
            variant="outline"
            destructive
            disabled={busy || missingWarehouse}
            leadingIcon={<Ban size={16} color={t.danger} />}
            onPress={() => openInterAgencyImpossible(order.reference, warehouse)}
          />
        ) : null}
      </View>

      <ConversationLink
        title="Logistique"
        count={order.logisticsConversation.messageCount}
        awaitingReply={order.logisticsConversation.awaitingBuyerReply}
        onPress={() => openInterAgencyConversation(order.reference, warehouse, 'logistics')}
      />
      {showHub ? (
        <ConversationLink
          title="HUB"
          count={order.hubConversation.messageCount}
          awaitingReply={order.hubConversation.awaitingBuyerReply}
          onPress={() => openInterAgencyConversation(order.reference, warehouse, 'hub')}
        />
      ) : null}

      {order.interAgencyImpossible ? (
        <DetailSection title="Impossibilité déclarée">
          <InfoRow
            label="Motif"
            value={
              order.interAgencyImpossibleReason
                ? INTER_AGENCY_REASON_LABELS[order.interAgencyImpossibleReason]
                : 'Non renseigné'
            }
          />
          {order.interAgencyImpossibleComment ? (
            <InfoRow label="Commentaire" value={order.interAgencyImpossibleComment} />
          ) : null}
          {order.interAgencyImpossibleByName ? (
            <InfoRow label="Déclarée par" value={order.interAgencyImpossibleByName} />
          ) : null}
          {order.interAgencyImpossibleAt ? (
            <InfoRow label="Le" value={formatDateTime(order.interAgencyImpossibleAt) ?? '—'} />
          ) : null}
          <InfoRow
            label="Suivi HUB"
            value={
              order.customerNotifiedAt
                ? `Client prévenu par ${order.customerNotifiedByName ?? '—'}`
                : order.hubAckAt
                  ? `Pris en charge par ${order.hubAckByName ?? '—'}`
                  : 'En attente de prise en charge'
            }
          />
        </DetailSection>
      ) : null}

      {order.interAgencyDone ? (
        <DetailSection title="Réalisation">
          {order.interAgencyDoneByName ? (
            <InfoRow label="Par" value={order.interAgencyDoneByName} />
          ) : null}
          {order.interAgencyDoneAt ? (
            <InfoRow label="Le" value={formatDateTime(order.interAgencyDoneAt) ?? '—'} />
          ) : null}
          {order.interAgencyDoneComment ? (
            <InfoRow label="Commentaire" value={order.interAgencyDoneComment} />
          ) : null}
          {order.interAgencyDoneDispatches.map((dispatch) => (
            <View key={dispatch.id} style={styles.dispatch}>
              <Text style={styles.dispatchName}>
                {dispatch.agencyName}
                {dispatch.internalRef ? ` · ${dispatch.internalRef}` : ''}
              </Text>
              <Text style={styles.dispatchState}>
                {dispatch.emailOpenedAt
                  ? `E-mail lu le ${formatDateTime(dispatch.emailOpenedAt)}`
                  : 'E-mail non lu'}
                {'  ·  '}
                {dispatch.processedAt
                  ? `Bien traitée le ${formatDateTime(dispatch.processedAt)}`
                  : 'En attente de traitement'}
              </Text>
            </View>
          ))}
        </DetailSection>
      ) : null}

      <DetailSection title="Articles">
        {order.rows.map((row) => (
          <View key={row.reference} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowRef}>{row.reference}</Text>
              {row.name ? (
                <Text style={styles.rowName} numberOfLines={2}>
                  {row.name}
                </Text>
              ) : null}
            </View>
            <Text style={styles.rowQty}>× {formatInteger(row.quantity)}</Text>
          </View>
        ))}
      </DetailSection>

      {order.stockDetails.length > 0 ? (
        <DetailSection title="Inter-agence conseillée">
          {order.stockDetails.map((detail) => (
            <View key={detail.productRef} style={styles.stock}>
              <Text style={styles.rowRef}>{detail.productRef}</Text>
              <Text style={styles.stockLine}>
                Entrepôt affecté {formatInteger(detail.assignedWarehouseStock)}  ·  QG{' '}
                {formatInteger(detail.qgStock)}  ·  Autres entrepôts{' '}
                {formatInteger(detail.otherWarehouseTotal)}
              </Text>
              {detail.otherWarehouseAgencies.length > 0 ? (
                <View style={styles.badges}>
                  {detail.otherWarehouseAgencies.map((agency) => (
                    <Badge
                      key={agency.code}
                      label={`${agency.name} · ${agency.stock}`}
                      tone="green"
                    />
                  ))}
                </View>
              ) : (
                <Text style={styles.stockLine}>Aucune agence avec du stock.</Text>
              )}
            </View>
          ))}
        </DetailSection>
      ) : null}

      <DetailSection title="Commande">
        <InfoRow label="Référence boutique" value={order.reference} mono copyLabel="Référence" />
        {order.ebatRef ? (
          <InfoRow label="Référence eBat" value={order.ebatRef} mono copyLabel="Référence eBat" />
        ) : null}
        <InfoRow
          label="Créée"
          value={`${formatDate(order.createdAt) ?? '—'} (${ageLabel(days)})`}
        />
        {order.origin ? <InfoRow label="Origine" value={order.origin} /> : null}
        {order.distributorName ? <InfoRow label="Fournisseur" value={order.distributorName} /> : null}
        <InfoRow
          label="Acheteurs"
          value={order.buyers.map((buyer) => buyer.code || buyer.name).join(', ') || '—'}
        />
      </DetailSection>

      <Text style={styles.footnote}>
        Une commande disparaît dès qu&apos;elle est expédiée, collectée ou livrée.
      </Text>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  hero: { gap: spacing.xs },
  reference: {
    fontFamily: monoFontFamily,
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: t.text,
  },
  sub: { fontFamily: monoFontFamily, fontSize: fontSize.xs, color: t.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2, paddingTop: spacing.xs },
  actions: { gap: spacing.sm },
  warning: { fontSize: fontSize.xs, color: t.warning },
  dispatch: { gap: 2, padding: spacing.md, borderRadius: radius.md, backgroundColor: t.surface },
  dispatchName: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  dispatchState: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  rowText: { flex: 1, gap: 2 },
  rowRef: { fontFamily: monoFontFamily, fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  rowName: { fontSize: fontSize.xs, color: t.textMuted },
  rowQty: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  stock: { gap: spacing.xs },
  stockLine: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  footnote: {
    paddingHorizontal: spacing.lg,
    textAlign: 'center',
    fontSize: fontSize.xs,
    lineHeight: 17,
    color: t.textFaint,
  },
}));

