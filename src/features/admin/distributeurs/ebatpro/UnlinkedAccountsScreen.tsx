import { FlatList, RefreshControl, View } from 'react-native';
import { KeyRound } from 'lucide-react-native';

import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { spacing, useTheme } from '@/theme';

import { Notice } from '../../shared/components/FormParts';
import { useEbatproAccounts } from '../hooks';
import { EbatproAccountRow } from './EbatproAccountRow';
import { useEbatproActions } from './useEbatproActions';

/** Comptes eBatPro sans entrepôt : à rattacher (modification) ou à supprimer. */
export function UnlinkedAccountsScreen() {
  const t = useTheme();
  const query = useEbatproAccounts();
  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await query.refetch();
  });
  const encryption = query.data?.encryptionAvailable ?? true;
  const actions = useEbatproActions(encryption);
  const items = (query.data?.accounts ?? []).filter((a) => !a.distributorWarehouseId);

  return (
    <FlatList
      data={items}
      keyExtractor={(a) => a.id}
      renderItem={({ item }) => (
        <EbatproAccountRow account={item} busy={actions.busyId === item.id} onPress={() => void actions.openMenu(item)} />
      )}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: spacing.xl, paddingBottom: 160, gap: spacing.md, flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={t.accentText} />}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.sm }}>
          <Notice tone="warning">
            Ces comptes ne sont rattachés à aucun entrepôt : ils ne servent à aucune commande. Rattachez-les (Modifier) ou supprimez-les.
          </Notice>
        </View>
      }
      ListEmptyComponent={
        query.isLoading ? (
          <ListSkeleton rows={3} height={90} />
        ) : query.error ? (
          <ErrorBanner error={query.error} fallback="Impossible de charger les comptes" onRetry={() => void query.refetch()} />
        ) : (
          <EmptyState icon={<KeyRound size={24} color={t.textMuted} />} title="Aucun compte non rattaché" />
        )
      }
    />
  );
}
