import { RefreshControl, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { PackageX } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubProductSheet } from '@/auth/permissions';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { openProduct } from '@/features/search/navigation';
import { makeStyles, spacing, useTheme } from '@/theme';

import { OrderDetail } from './components/OrderDetail';
import { useOrderDetail } from './hooks/useOrderDetail';

/**
 * Fiche d'une commande, en lecture seule (`GET hub-app/orders/logistics-detail/:reference`).
 * Ouverte à tout compte HUB ; le lien vers la fiche produit n'apparaît que pour les rôles
 * qui peuvent la consulter.
 */
export function OrderDetailScreen() {
  const styles = useStyles();
  const t = useTheme();
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const { user } = useAuth();
  const { detail, notFound, loading, error, refetch } = useOrderDetail(reference);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  const canOpenProducts = !!user && canAccessHubProductSheet(user.role);

  return (
    <>
      <Stack.Screen options={{ title: reference ?? 'Commande' }} />
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
        {loading ? <ListSkeleton rows={4} height={140} /> : null}
        {error ? (
          <ErrorBanner
            error={error}
            fallback="Impossible de charger la commande"
            onRetry={() => void onRefresh()}
          />
        ) : null}
        {notFound ? (
          <EmptyState
            icon={<PackageX size={24} color={t.textMuted} />}
            title="Commande introuvable"
            text="Aucune commande ne correspond à cette référence."
          />
        ) : null}
        {detail ? (
          <OrderDetail data={detail} onOpenProduct={canOpenProducts ? openProduct : undefined} />
        ) : null}
      </ScrollView>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  scroll: { flex: 1, backgroundColor: t.bg },
  content: { padding: spacing.xl, gap: spacing['2xl'], paddingBottom: spacing['4xl'] },
}));
