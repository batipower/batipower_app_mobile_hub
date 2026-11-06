import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { PackageX } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubPreparation } from '@/auth/permissions';
import { Card } from '@/components/ui';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner } from '@/features/preparation/components/ListState';
import { OrderTagBadges } from '@/features/preparation/components/OrderTagBadges';
import { usePreparationOrder } from '@/features/preparation/hooks/usePreparationOrders';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import {
  addressLines,
  ageLabel,
  formatDateTime,
  formatWeight,
  getNbColis,
  getTotalPieces,
  getTotalWeight,
  recipientName,
} from '@/features/preparation/orderHelpers';
import { colors, fontSize, monoFontFamily, onDark, spacing, typography } from '@/theme';
import type { PreparationOrder } from '@/types/preparation';

/** Détail d'une commande à préparer, lu dans la liste déjà chargée (pas d'appel dédié). */
export default function PreparationOrderScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canAccessHubPreparation(user.role) ? <OrderDetail /> : <AccessDenied />;
}

function OrderDetail() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const { order, loading, error, refetch } = usePreparationOrder(reference);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  return (
    <>
      <Stack.Screen options={{ title: reference ?? 'Commande' }} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.green} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={colors.green}
            />
          }
        >
          {error ? (
            <ErrorBanner
              error={error}
              fallback="Impossible de charger la commande"
              onRetry={() => void onRefresh()}
            />
          ) : null}
          {order ? (
            <OrderContent order={order} />
          ) : error ? null : (
            <EmptyState
              icon={<PackageX size={24} color={onDark.textMuted} />}
              title="Commande introuvable"
              text="Cette commande est introuvable ou a déjà été traitée."
            />
          )}
        </ScrollView>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card contentStyle={styles.cardContent}>{children}</Card>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function OrderContent({ order }: { order: PreparationOrder }) {
  const rows = order.rows ?? [];
  const lines = addressLines(order.deliveryAddress);
  const created = formatDateTime(order.createdAt);
  const carrier = order.carrier?.name?.trim();
  const tracking = order.warehouseOrder?.noSuivi?.trim();

  return (
    <>
      <Section title="Commande">
        <Text style={styles.reference}>{order.reference}</Text>
        {order.ebatRef ? <InfoRow label="Réf. eBat" value={order.ebatRef} /> : null}
        {created ? (
          <InfoRow label="Créée le" value={`${created} (il y a ${ageLabel(order.createdAt)})`} />
        ) : null}
        <OrderTagBadges tags={order.warehouseOrder?.tags ?? []} maxCustom={6} />
      </Section>

      <Section title={`Articles (${rows.length})`}>
        {rows.length === 0 ? (
          <Text style={styles.muted}>Aucun article.</Text>
        ) : (
          rows.map((row, index) => (
            <View
              key={row.uuid ?? `${row.reference}-${index}`}
              style={[styles.article, index > 0 && styles.articleBorder]}
            >
              <Text style={styles.quantity}>{row.quantity}×</Text>
              <View style={styles.articleBody}>
                <Text style={styles.articleRef}>{row.reference}</Text>
                {row.name ? <Text style={styles.articleName}>{row.name}</Text> : null}
              </View>
              <Text style={styles.articleWeight}>
                {formatWeight((row.weightInGrams || 0) * (row.quantity || 0))}
              </Text>
            </View>
          ))
        )}
        <View style={styles.totals}>
          <InfoRow label="Pièces" value={String(getTotalPieces(order))} />
          <InfoRow label="Poids total" value={formatWeight(getTotalWeight(order))} />
        </View>
      </Section>

      <Section title="Livraison">
        <Text style={styles.recipient}>{recipientName(order.deliveryAddress)}</Text>
        {lines.length > 0 ? (
          <View>
            {lines.map((line) => (
              <Text key={line} style={styles.addressLine}>
                {line}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>Adresse non renseignée.</Text>
        )}
        <View style={styles.totals}>
          <InfoRow label="Transporteur" value={carrier || '—'} />
          <InfoRow label="Colis" value={String(getNbColis(order))} />
          {tracking ? <InfoRow label="N° de suivi" value={tracking} /> : null}
        </View>
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.black },
  content: { padding: spacing.xl, gap: spacing['2xl'], paddingBottom: spacing['4xl'] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.label, color: onDark.textSubtle, paddingHorizontal: spacing.xs },
  cardContent: { padding: spacing.lg, gap: spacing.md },
  reference: {
    fontFamily: monoFontFamily,
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.white,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg },
  infoLabel: { fontSize: fontSize.sm, color: onDark.textMuted },
  infoValue: {
    flexShrink: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'right',
  },
  article: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  articleBorder: {
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: onDark.border,
  },
  quantity: { minWidth: 36, fontSize: fontSize.lg, fontWeight: '800', color: colors.white },
  articleBody: { flex: 1, gap: 2 },
  articleRef: {
    fontFamily: monoFontFamily,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.green,
  },
  articleName: { fontSize: fontSize.xs, lineHeight: 17, color: onDark.textMuted },
  articleWeight: { fontSize: fontSize.xs, color: onDark.textSubtle },
  totals: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: onDark.border,
  },
  recipient: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
  addressLine: { fontSize: fontSize.sm, lineHeight: 20, color: onDark.textMuted },
  muted: { fontSize: fontSize.sm, color: onDark.textSubtle },
});
