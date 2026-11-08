import { Alert, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, RotateCcw } from 'lucide-react-native';

import { Badge, Button, DetailSection, InfoRow } from '@/components/ui';
import { formatDate, formatDateTime, formatEuro, formatInteger } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, radius, spacing, useTheme, withAlpha } from '@/theme';

import { openDeliveryNoteConversation } from '../navigation';
import { warehouseLabel } from '../products/constants';
import { ConversationLink } from '../shared/ConversationLink';
import { DetailScroll } from '../shared/DetailScroll';
import { ProductThumb } from '../shared/ProductThumb';
import { formatDiff } from './constants';
import { useDeliveryNoteActions } from './hooks/useDeliveryNoteActions';
import { useDeliveryNoteDetail } from './hooks/useDeliveryNoteDetail';

/**
 * Fiche d'un BL : totaux et écart, lignes (celles en écart sont mises en avant), statut « traité »
 * partagé par le service, et fil de discussion. Marquer traité / rouvrir comme sur le web ; un BL
 * résolu par la direction n'a plus d'action. Le PDF et le contrôle restent sur l'espace web.
 */
export function DeliveryNoteDetailScreen() {
  const styles = useStyles();
  const t = useTheme();
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const { note, loading, error, notFound, refetch } = useDeliveryNoteDetail(uuid);
  const { treat, untreat } = useDeliveryNoteActions(uuid ?? '');

  const treated = !!note?.treatedAt;
  const forced = !!note?.forcedResolvedAt;
  const label = note?.deliveryNoteReference ?? note?.numOrderEbat ?? 'BL';

  return (
    <>
      <Stack.Screen options={{ title: `BL ${label}` }} />
      <DetailScroll
        loading={loading}
        error={error}
        notFound={notFound}
        notFoundTitle="BL introuvable"
        notFoundText="Ce BL n'existe plus ou n'est pas accessible à votre compte."
        errorFallback="Impossible de charger le BL"
        refetch={refetch}
      >
        {note ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.reference}>{label}</Text>
              <View style={styles.badges}>
                <Badge label={warehouseLabel(note.warehouse)} tone="neutral" />
                {forced ? (
                  <Badge label="Résolu par la direction" tone="purple" />
                ) : treated ? (
                  <Badge label="Traité" tone="green" />
                ) : (
                  <Badge label="À traiter" tone="amber" />
                )}
                {note.isSolved && !forced ? <Badge label="Écart résolu" tone="green" /> : null}
              </View>
            </View>

            {!forced ? (
              <View>
                {treated ? (
                  <Button
                    label="Rouvrir le BL"
                    variant="outline"
                    loading={untreat.isPending}
                    leadingIcon={<RotateCcw size={16} color={t.text} />}
                    onPress={() =>
                      Alert.alert(
                        'Rouvrir ce BL ?',
                        'Le BL repasse « à traiter » pour tout le service.',
                        [
                          { text: 'Retour', style: 'cancel' },
                          { text: 'Rouvrir', onPress: () => untreat.mutate() },
                        ],
                      )
                    }
                  />
                ) : (
                  <Button
                    label="Marquer traité"
                    loading={treat.isPending}
                    leadingIcon={<CheckCircle2 size={16} color={t.onAccent} />}
                    onPress={() =>
                      Alert.alert(
                        'Marquer ce BL traité ?',
                        "Le statut est partagé par tout le service. Assurez-vous que l'écart de prix a bien été corrigé.",
                        [
                          { text: 'Retour', style: 'cancel' },
                          { text: 'Marquer traité', onPress: () => treat.mutate() },
                        ],
                      )
                    }
                  />
                )}
              </View>
            ) : null}

            <ConversationLink
              count={note.messagesCount}
              preview={
                note.lastMessageContent
                  ? `${note.lastMessageAuthorName ?? ''}${note.lastMessageAuthorName ? ' : ' : ''}${note.lastMessageContent}`
                  : null
              }
              onPress={() => openDeliveryNoteConversation(note.uuid)}
            />

            <DetailSection title="Totaux">
              <InfoRow label="Net à payer" value={formatEuro(note.totalNetAPayer)} />
              <InfoRow label="Total HT estimé" value={formatEuro(note.totalHTEstime)} />
              <InfoRow label="Écart" value={formatDiff(note.absoluteDiff, note.percentDiff)} />
              <InfoRow label="Lignes en écart" value={formatInteger(note.linesInErrorCount)} />
            </DetailSection>

            <DetailSection title={`Lignes (${note.lines.length})`}>
              {note.lines.map((line) => (
                <View
                  key={line.ebatRef}
                  style={[styles.line, line.isError && styles.lineError]}
                >
                  <ProductThumb base64={line.thumbnailBase64} size={44} />
                  <View style={styles.lineBody}>
                    <Text style={styles.lineName} numberOfLines={2}>
                      {line.designation ?? line.ebatRef}
                    </Text>
                    <Text style={styles.lineRef} numberOfLines={1}>
                      {line.ebatRef}
                      {line.brand ? `  ·  ${line.brand}` : ''}
                    </Text>
                    <Text style={styles.linePrices}>
                      Lu {formatEuro(line.priceRead)}  ·  Attendu {formatEuro(line.priceExpected)}  ·  ×{' '}
                      {formatInteger(line.quantity)}
                    </Text>
                    {line.isError ? (
                      <Text style={[styles.lineDiff, { color: t.danger }]}>
                        Écart {formatDiff(line.absoluteDiff, line.percentDiff)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </DetailSection>

            <DetailSection title="Suivi">
              <InfoRow label="Reçu le" value={formatDate(note.createdAt) ?? '—'} />
              {note.numOrderEbat ? (
                <InfoRow label="Commande eBat" value={note.numOrderEbat} mono copyLabel="Commande eBat" />
              ) : null}
              {note.numOrderWarehouse ? (
                <InfoRow label="Commande entrepôt" value={note.numOrderWarehouse} mono />
              ) : null}
              {note.brands.length > 0 ? (
                <InfoRow label="Marques" value={note.brands.join(', ')} />
              ) : null}
              {note.treatedAt ? (
                <InfoRow
                  label="Traité"
                  value={`${note.treatedByName ?? '—'} · ${formatDateTime(note.treatedAt) ?? ''}`}
                />
              ) : null}
              {note.forcedResolvedAt ? (
                <InfoRow label="Résolu le" value={formatDateTime(note.forcedResolvedAt) ?? '—'} />
              ) : null}
            </DetailSection>

            <Text style={styles.footnote}>
              Le PDF du BL et les corrections de prix se gèrent depuis l&apos;espace web.
            </Text>
          </>
        ) : null}
      </DetailScroll>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  hero: { gap: spacing.xs },
  reference: { fontFamily: monoFontFamily, fontSize: fontSize.xl, fontWeight: '700', color: t.text },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2, paddingTop: spacing.xs },
  line: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  lineError: { backgroundColor: withAlpha(t.danger, 0.08) },
  lineBody: { flex: 1, gap: 2 },
  lineName: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  lineRef: { fontFamily: monoFontFamily, fontSize: fontSize.xs, color: t.textMuted },
  linePrices: { fontSize: fontSize.xs, color: t.textMuted },
  lineDiff: { fontSize: fontSize.xs, fontWeight: '700' },
  footnote: {
    paddingHorizontal: spacing.lg,
    textAlign: 'center',
    fontSize: fontSize.xs,
    lineHeight: 17,
    color: t.textFaint,
  },
}));
