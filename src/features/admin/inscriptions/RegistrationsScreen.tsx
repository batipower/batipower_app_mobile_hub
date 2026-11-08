import { FlatList, RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import { UserCheck } from 'lucide-react-native';

import { Badge, Button, Card } from '@/components/ui';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { formatDateTime } from '@/lib/format';
import { MODULES } from '@/modules/registry';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { PendingRegistration } from '@/types/admin';

import { usePendingRegistrations } from '../hooks/useAdminPendingCounts';
import { effectiveModules } from '../shared/accessRules';

/** Demandes d'accès en attente : approuver (rôle, modules, rattachement) ou refuser avec un motif. */
export function RegistrationsScreen() {
  const styles = useStyles();
  const t = useTheme();
  const query = usePendingRegistrations();
  const { refreshing, onRefresh } = usePullToRefresh(query.refetch);
  const items = query.data ?? [];

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={t.accentText}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.total}>
            {query.data
              ? `${items.length} demande${items.length > 1 ? 's' : ''} en attente`
              : 'Chargement…'}
          </Text>
          {query.error && items.length > 0 ? (
            <ErrorBanner
              error={query.error}
              fallback="Impossible de charger les inscriptions"
              onRetry={() => void onRefresh()}
            />
          ) : null}
        </View>
      }
      renderItem={({ item }) => <RegistrationCard item={item} />}
      ListEmptyComponent={
        query.isLoading ? (
          <ListSkeleton rows={3} height={130} />
        ) : query.error ? (
          <ErrorBanner
            error={query.error}
            fallback="Impossible de charger les inscriptions"
            onRetry={() => void onRefresh()}
          />
        ) : (
          <EmptyState
            icon={<UserCheck size={24} color={t.textMuted} />}
            title="Aucune demande"
            text="Aucune inscription n'est en attente de validation."
          />
        )
      }
    />
  );
}

function RegistrationCard({ item }: { item: PendingRegistration }) {
  const styles = useStyles();
  const requested = effectiveModules(item.modules);

  return (
    <Card style={styles.card} contentStyle={styles.cardContent}>
      <View style={styles.identity}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.email} numberOfLines={1} selectable>
          {item.email}
        </Text>
        <Text style={styles.date}>Demandé le {formatDateTime(item.createdAt) ?? '—'}</Text>
      </View>
      <View style={styles.badges}>
        {requested.map((id) => (
          <Badge
            key={id}
            label={MODULES[id].name}
            tone={id === item.defaultModule ? 'blue' : 'neutral'}
          />
        ))}
      </View>
      <View style={styles.actions}>
        <Button
          label="Refuser"
          variant="outline"
          style={styles.action}
          onPress={() => router.push({ pathname: '/admin/inscriptions/refuser', params: { id: item.id } })}
        />
        <Button
          label="Approuver"
          style={styles.action}
          onPress={() =>
            router.push({ pathname: '/admin/inscriptions/approuver', params: { id: item.id } })
          }
        />
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  content: { flexGrow: 1, padding: spacing.xl, paddingBottom: 160, gap: spacing.md },
  header: { gap: spacing.md },
  total: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  card: {},
  cardContent: { gap: spacing.md },
  identity: { gap: 2 },
  name: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  email: { fontSize: fontSize.sm, color: t.textMuted },
  date: { fontSize: fontSize.xs, color: t.textSubtle, marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
}));
