import { FlatList, RefreshControl, View } from 'react-native';
import { PackageOpen, Search } from 'lucide-react-native';

import { useTabBarInset } from '@/components/navigation/tabBarInset';
import { makeStyles, spacing, useTheme } from '@/theme';
import type { PreparationOrder } from '@/types/preparation';

import { EmptyState, ErrorBanner, ListSkeleton } from './ListState';
import { OrderCard } from './OrderCard';

type OrdersListProps = {
  orders: PreparationOrder[];
  /** Premier chargement, aucune donnée en cache. */
  loading: boolean;
  error: unknown;
  /** Un filtre ou une recherche réduit la liste : adapte le message « vide ». */
  filtered: boolean;
  refreshing: boolean;
  onRefresh: () => void;
};

const keyExtractor = (order: PreparationOrder) => order.reference;

/** Liste des commandes à préparer, avec tirer pour rafraîchir. */
export function OrdersList({
  orders,
  loading,
  error,
  filtered,
  refreshing,
  onRefresh,
}: OrdersListProps) {
  const styles = useStyles();
  const tabBarInset = useTabBarInset();
  const t = useTheme();
  return (
    <FlatList
      data={orders}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => <OrderCard order={item} />}
      ItemSeparatorComponent={Separator}
      contentContainerStyle={[styles.content, { paddingBottom: tabBarInset + spacing.lg }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      initialNumToRender={8}
      windowSize={9}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accentText} />
      }
      ListHeaderComponent={
        error ? (
          <View style={styles.banner}>
            <ErrorBanner
              error={error}
              fallback="Impossible de charger les commandes"
              onRetry={onRefresh}
            />
          </View>
        ) : undefined
      }
      ListEmptyComponent={
        loading ? (
          <ListSkeleton />
        ) : error ? undefined : filtered ? (
          <EmptyState
            icon={<Search size={24} color={t.textMuted} />}
            title="Aucune commande"
            text="Aucune commande ne correspond à ce filtre ou à cette recherche."
          />
        ) : (
          <EmptyState
            icon={<PackageOpen size={24} color={t.textMuted} />}
            title="Tout est préparé"
            text="Il n'y a aucune commande à préparer pour le moment."
          />
        )
      }
    />
  );
}

function Separator() {
  const styles = useStyles();
  return <View style={styles.separator} />;
}

const useStyles = makeStyles(() => ({
  content: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing['3xl'] },
  separator: { height: spacing.md },
  banner: { marginBottom: spacing.md },
}));
