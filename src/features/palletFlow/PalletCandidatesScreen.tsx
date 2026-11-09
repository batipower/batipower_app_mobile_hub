import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { ChevronRight, PackageCheck } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubPalletFlow } from '@/auth/permissions';
import { Badge } from '@/components/ui';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { warehouseLabel } from '@/features/pricing/options';
import { formatEuro, formatRelative } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, radius, shadow, spacing, useTheme } from '@/theme';
import type { HubPalletCandidate } from '@/types/hubPalletFlow';

import { usePalletCandidates } from './hooks/usePalletCandidates';
import { openPalletCandidateFromList } from './navigation';

const keyExtractor = (item: HubPalletCandidate) => item.reference;

/** Commandes candidates palette à arbitrer, réservées au SUPERADMIN (rattrape un push manqué). */
export function PalletCandidatesScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canAccessHubPalletFlow(user.role) ? (
    <PalletCandidates />
  ) : (
    <AccessDenied
      title="Accès réservé"
      text="Les candidats palette sont réservés aux comptes Super Admin."
    />
  );
}

function PalletCandidates() {
  const styles = useStyles();
  const t = useTheme();
  const query = usePalletCandidates();
  const { refreshing, onRefresh } = usePullToRefresh(query.refetch);
  const items = query.data?.items ?? [];
  const count = query.data?.count ?? 0;

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => <CandidateCard item={item} />}
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
      ListHeaderComponent={
        query.data ? (
          <View style={styles.summary}>
            <Text style={styles.subtitle}>
              {count === 0
                ? 'Aucune commande à arbitrer'
                : `${count} commande${count > 1 ? 's' : ''} à arbitrer (palette ou flux classique)`}
            </Text>
            {query.isFetching && !refreshing ? (
              <ActivityIndicator size="small" color={t.accentText} />
            ) : null}
          </View>
        ) : undefined
      }
      ListEmptyComponent={
        query.isPending ? (
          <ListSkeleton rows={3} height={96} />
        ) : query.error ? (
          <ErrorBanner
            error={query.error}
            fallback="Impossible de charger les candidats palette"
            onRetry={() => void onRefresh()}
          />
        ) : (
          <EmptyState
            icon={<PackageCheck size={24} color={t.textMuted} />}
            title="Rien à arbitrer"
            text="Les commandes éligibles au flux palette apparaîtront ici."
          />
        )
      }
    />
  );
}

function CandidateCard({ item }: { item: HubPalletCandidate }) {
  const styles = useStyles();
  const t = useTheme();
  const age = formatRelative(item.flaggedAt);

  return (
    <Pressable
      onPress={() => openPalletCandidateFromList(item.reference)}
      accessibilityRole="button"
      accessibilityLabel={`Arbitrer la commande ${item.reference}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Text style={styles.reference} numberOfLines={1}>
          {item.reference}
        </Text>
        <ChevronRight size={16} color={t.textFaint} />
      </View>
      {item.ebatRef ? <Text style={styles.subReference}>{item.ebatRef}</Text> : null}
      <View style={styles.footer}>
        <Text style={styles.amount}>{formatEuro(item.totalPaid)} TTC</Text>
        {item.palletNaturalWarehouse ? (
          <Badge label={warehouseLabel(item.palletNaturalWarehouse)} tone="blue" />
        ) : null}
        {age ? <Text style={styles.age}>{age}</Text> : null}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  content: { flexGrow: 1, padding: spacing.xl, gap: spacing.md, paddingBottom: spacing['4xl'] },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.sm },
  subtitle: { flex: 1, fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    ...shadow.sm,
  },
  pressed: { backgroundColor: t.cardPressed },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reference: {
    flex: 1,
    fontFamily: monoFontFamily,
    fontSize: fontSize.base,
    fontWeight: '700',
    color: t.text,
  },
  subReference: { fontFamily: monoFontFamily, fontSize: fontSize.xs, color: t.textSubtle },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  amount: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  age: { fontSize: fontSize.xs, color: t.textSubtle, marginLeft: 'auto' },
}));
