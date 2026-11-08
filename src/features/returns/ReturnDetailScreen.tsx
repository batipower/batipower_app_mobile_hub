import { useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Package, PackageX, Pencil, StickyNote } from 'lucide-react-native';

import type { HubReturnOrderRow, ReturnBrokenCause, ReturnItemCondition } from '@/api/hubReturns';
import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubReturns } from '@/auth/permissions';
import { Badge, Button, DetailSection, Divider, InfoRow } from '@/components/ui';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { thumbnailUri } from '@/features/products/productDisplay';
import { openOrder } from '@/features/search/navigation';
import { formatDate, formatDateTime, formatEuro } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, radius, spacing, useTheme } from '@/theme';

import { ConditionPicker } from './components/ConditionPicker';
import { PackagingPicker } from './components/PackagingPicker';
import {
  conditionKey,
  conditionLabel,
  returnSourceLabel,
  returnStatusLabel,
} from './constants';
import { useReturnDetail, type ReturnDetailState } from './hooks/useReturnDetail';
import { useReturnMutations } from './hooks/useReturnMutations';
import { openReturnNote, openReturnReceive } from './navigation';

/** Fiche d'un retour de commande, réservée aux SUPERADMIN et MANAGER. */
export function ReturnDetailScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canAccessHubReturns(user.role) ? (
    <ReturnDetail />
  ) : (
    <AccessDenied
      title="Accès réservé"
      text="Les retours de commande sont réservés aux comptes Manager et Super Admin."
    />
  );
}

function ReturnDetail() {
  const styles = useStyles();
  const t = useTheme();
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const detail = useReturnDetail(reference ?? '');
  const { query, order, orderReference } = detail;
  const { refreshing, onRefresh } = usePullToRefresh(query.refetch);
  const payload = query.data;

  // Un n° de suivi saisi ou scanné se résout sous la référence de la commande : on aligne la route
  // dessus pour que les feuilles et un rechargement visent directement la commande.
  useEffect(() => {
    if (orderReference && reference && orderReference !== reference) {
      router.setParams({ reference: orderReference });
    }
  }, [orderReference, reference]);

  const missing = !query.isPending && !query.error && (!payload?.success || !order);

  return (
    <>
      <Stack.Screen options={{ title: orderReference ?? reference ?? 'Retour' }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={t.accentText}
          />
        }
      >
        {query.isPending ? <ListSkeleton rows={3} height={150} /> : null}
        {query.error && !order ? (
          <ErrorBanner
            error={query.error}
            fallback="Impossible de charger ce retour"
            onRetry={() => void onRefresh()}
          />
        ) : null}
        {missing ? (
          <EmptyState
            icon={<PackageX size={24} color={t.textMuted} />}
            title="Commande introuvable"
            text={payload?.message || `Aucune commande pour « ${reference} ».`}
          />
        ) : null}
        {order ? <ReturnDetailBody detail={detail} /> : null}
      </ScrollView>
    </>
  );
}

function ReturnDetailBody({ detail }: { detail: ReturnDetailState }) {
  const styles = useStyles();
  const t = useTheme();
  const { order, actionReference } = detail;
  const { updateCondition, updatePackaging, undoReceive } = useReturnMutations(actionReference);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  if (!order) return null;

  const address = order.deliveryAddress;
  const customer = [address?.firstname, address?.lastname].filter(Boolean).join(' ') || null;
  const location = [address?.zipcode, address?.city].filter(Boolean).join(' ') || null;
  const phone = address?.mobile || address?.phone || null;

  const selectCondition = (condition: ReturnItemCondition, brokenCause: ReturnBrokenCause | null) => {
    setPendingKey(conditionKey(condition, brokenCause));
    updateCondition.mutate({ condition, brokenCause }, { onSettled: () => setPendingKey(null) });
  };

  const confirmUndo = () =>
    Alert.alert(
      'Annuler la réception ?',
      'Le retour redeviendra « à réceptionner » et vous pourrez recommencer.',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: () => undoReceive.mutate(),
        },
      ],
    );

  const partial = detail.isAlreadyVerified && !detail.isReturnReceived;
  const stateLine = conditionLabel(detail.recordedCondition, detail.recordedBrokenCause);
  const reason = detail.primaryMarketplaceReturn?.returnReason ?? null;
  const comment = detail.primaryMarketplaceReturn?.customerComment ?? null;

  return (
    <>
      <DetailSection title="Commande">
        <InfoRow label="Référence" value={order.reference} mono copyLabel="Référence" />
        {order.ebatRef ? <InfoRow label="Réf. eBat" value={order.ebatRef} mono copyLabel="Réf. eBat" /> : null}
        {customer ? <InfoRow label="Client" value={customer} /> : null}
        {location ? <InfoRow label="Ville" value={location} /> : null}
        {phone ? <InfoRow label="Téléphone" value={phone} mono copyLabel="Téléphone" /> : null}
        <InfoRow label="Passée le" value={formatDate(order.createdAt) ?? '—'} />
        <InfoRow label="Total payé" value={order.totalPaid != null ? formatEuro(order.totalPaid) : '—'} />
        {order.paymentStatus ? <InfoRow label="Paiement" value={order.paymentStatus} /> : null}
        {order.carrier?.name ? <InfoRow label="Transporteur" value={order.carrier.name} /> : null}
        <View style={styles.badges}>
          {order.status ? <Badge label={order.status} tone="neutral" /> : null}
          {order.origin ? <Badge label={order.origin} tone="blue" /> : null}
        </View>
        <Divider />
        <InfoRow
          label="Fiche commande"
          value="Voir"
          icon={Package}
          actionHint="Ouvrir la commande"
          onPress={() => openOrder(order.reference)}
        />
      </DetailSection>

      <DetailSection title="Réception">
        {detail.isReturnReceived ? (
          <>
            <View style={styles.badges}>
              <Badge
                label={detail.returnType === 'relay-point' ? 'Reçu en point relais' : 'Retour reçu'}
                tone="green"
              />
            </View>
            <InfoRow label="Reçu le" value={formatDateTime(detail.verifiedDate) ?? '—'} />
            <InfoRow label="Par" value={detail.verifiedByName ?? 'Inconnu'} />
            <Button
              label="Annuler la réception"
              variant="outline"
              destructive
              loading={undoReceive.isPending}
              onPress={confirmUndo}
            />
          </>
        ) : (
          <>
            <View style={styles.badges}>
              <Badge label={partial ? 'Réception partielle' : 'À réceptionner'} tone="amber" />
            </View>
            {partial ? (
              <Text style={styles.muted}>
                {detail.pendingParcels} colis restant à réceptionner sur {detail.batch.length}.
              </Text>
            ) : null}
            <Button label="Réceptionner le retour" onPress={() => openReturnReceive(actionReference)} />
            {partial ? (
              <Button
                label="Annuler la réception"
                variant="outline"
                destructive
                loading={undoReceive.isPending}
                onPress={confirmUndo}
              />
            ) : null}
          </>
        )}
      </DetailSection>

      {detail.isAlreadyVerified ? (
        <>
          <DetailSection title="État de l'article">
            <ConditionPicker
              condition={detail.recordedCondition}
              brokenCause={detail.recordedBrokenCause}
              onSelect={selectCondition}
              pendingKey={updateCondition.isPending ? pendingKey : null}
              disabled={updateCondition.isPending || updatePackaging.isPending}
            />
            {stateLine ? (
              <Text style={styles.muted}>
                {stateLine}
                {detail.conditionMeta.by ? ` · par ${detail.conditionMeta.by}` : ''}
                {detail.conditionMeta.at ? ` · ${formatDateTime(detail.conditionMeta.at)}` : ''}
              </Text>
            ) : null}
          </DetailSection>

          <DetailSection title="Emballage (facultatif)">
            <PackagingPicker
              value={detail.recordedPackagingCondition}
              pendingValue={updatePackaging.isPending ? updatePackaging.variables?.value : undefined}
              disabled={updatePackaging.isPending || updateCondition.isPending}
              onChange={(value) =>
                updatePackaging.mutate({ value, recordedCondition: detail.recordedCondition })
              }
            />
            {detail.recordedPackagingCondition && (detail.packagingMeta.by || detail.packagingMeta.at) ? (
              <Text style={styles.muted}>
                {[
                  detail.packagingMeta.by ? `Saisi par ${detail.packagingMeta.by}` : null,
                  detail.packagingMeta.at ? formatDateTime(detail.packagingMeta.at) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : null}
          </DetailSection>
        </>
      ) : null}

      <DetailSection
        title="Remarque manager"
        trailing={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={detail.note ? 'Modifier la remarque' : 'Ajouter une remarque'}
            hitSlop={10}
            onPress={() => openReturnNote(actionReference)}
          >
            <Text style={styles.edit}>{detail.note ? 'Modifier' : 'Ajouter'}</Text>
          </Pressable>
        }
      >
        {detail.note ? (
          <>
            <View style={styles.noteRow}>
              <StickyNote size={16} color={t.warning} />
              <Text style={styles.noteText}>{detail.note.content}</Text>
            </View>
            <Text style={styles.muted}>
              {detail.note.authorName ?? detail.note.authorEmail ?? 'Auteur inconnu'} ·{' '}
              {formatDateTime(detail.note.updatedAt) ?? '—'}
            </Text>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => openReturnNote(actionReference)}
            style={styles.noteRow}
          >
            <Pencil size={16} color={t.textSubtle} />
            <Text style={styles.muted}>Aucune remarque pour ce retour.</Text>
          </Pressable>
        )}
      </DetailSection>

      <DetailSection title={`Articles (${order.rows.length})`}>
        {order.rows.length === 0 ? <Text style={styles.muted}>Aucun article.</Text> : null}
        {order.rows.map((row, index) => (
          <View key={row.uuid} style={styles.rowWrap}>
            {index > 0 ? <Divider /> : null}
            <OrderRow row={row} thumbnail={detail.thumbnails[row.reference] ?? null} />
          </View>
        ))}
      </DetailSection>

      <DetailSection title="Colis de retour">
        {detail.returnLabels.length === 0 && detail.marketplaceReturns.length === 0 ? (
          <Text style={styles.muted}>Aucune étiquette ni retour marketplace.</Text>
        ) : null}
        {detail.returnLabels.map((label, index) => (
          <View key={label.uuid} style={styles.rowWrap}>
            {index > 0 ? <Divider /> : null}
            <InfoRow label="N° de suivi" value={label.noSuivi} mono copyLabel="N° de suivi" />
            <View style={styles.badges}>
              <Badge label={returnStatusLabel(label.status)} tone="neutral" />
              {label.parcelCount > 1 ? (
                <Badge label={`Colis ${label.parcelIndex}/${label.parcelCount}`} tone="purple" />
              ) : null}
              <Badge
                label={label.packageReceivedAndVerified ? 'Vérifié' : 'À vérifier'}
                tone={label.packageReceivedAndVerified ? 'green' : 'amber'}
              />
            </View>
            <Text style={styles.muted}>Créé le {formatDateTime(label.createdAt) ?? '—'}</Text>
          </View>
        ))}
        {detail.marketplaceReturns.map((entry, index) => (
          <View key={entry.uuid} style={styles.rowWrap}>
            {index > 0 || detail.returnLabels.length > 0 ? <Divider /> : null}
            <InfoRow label="Marketplace" value={returnSourceLabel(entry.marketplace.toUpperCase())} />
            {entry.trackingNumber ? (
              <InfoRow label="N° de suivi" value={entry.trackingNumber} mono copyLabel="N° de suivi" />
            ) : null}
            <View style={styles.badges}>
              <Badge label={returnStatusLabel(entry.status)} tone="neutral" />
              <Badge
                label={entry.packageReceivedAndVerified ? 'Vérifié' : 'À vérifier'}
                tone={entry.packageReceivedAndVerified ? 'green' : 'amber'}
              />
            </View>
          </View>
        ))}
        {reason ? <InfoRow label="Raison du retour" value={reason} /> : null}
        {comment ? <Text style={styles.comment}>« {comment} »</Text> : null}
      </DetailSection>
    </>
  );
}

function OrderRow({ row, thumbnail }: { row: HubReturnOrderRow; thumbnail: string | null }) {
  const styles = useStyles();
  const t = useTheme();
  const uri = thumbnailUri(thumbnail);
  return (
    <View style={styles.article}>
      <View style={styles.thumbnail} accessibilityElementsHidden importantForAccessibility="no">
        {uri ? (
          <Image source={{ uri }} contentFit="contain" style={styles.image} recyclingKey={row.reference} />
        ) : (
          <Package size={22} color={t.textFaint} />
        )}
      </View>
      <View style={styles.articleBody}>
        <Text style={styles.articleName} numberOfLines={2}>
          {row.name?.trim() || row.reference}
        </Text>
        <Text style={styles.articleRef}>{row.reference}</Text>
        <Text style={styles.muted}>
          {row.quantity} × {formatEuro(row.productPrice)}
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  scroll: { flex: 1, backgroundColor: t.bg },
  content: { padding: spacing.xl, gap: spacing['2xl'], paddingBottom: spacing['4xl'] },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  muted: { fontSize: fontSize.xs, lineHeight: 17, color: t.textSubtle },
  edit: { fontSize: fontSize.sm, fontWeight: '700', color: t.accentText },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noteText: { flex: 1, fontSize: fontSize.sm, lineHeight: 20, color: t.text },
  comment: { fontSize: fontSize.sm, fontStyle: 'italic', color: t.textMuted },
  rowWrap: { gap: spacing.md },
  article: { flexDirection: 'row', gap: spacing.md },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: t.surface,
  },
  image: { width: '100%', height: '100%' },
  articleBody: { flex: 1, gap: 2 },
  articleName: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  articleRef: { fontFamily: monoFontFamily, fontSize: fontSize.xs, color: t.textMuted },
}));
