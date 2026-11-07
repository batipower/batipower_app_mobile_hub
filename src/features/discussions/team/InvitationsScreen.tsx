import { FlatList, Text, View, type ListRenderItemInfo } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { MailPlus } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { discussionsApi } from '@/api/discussions';
import { Button } from '@/components/ui';
import {
  EmptyState,
  ErrorBanner,
  ListSkeleton,
  errorMessage,
} from '@/features/preparation/components/ListState';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { GroupConversationPendingInvitation } from '@/types/discussions';

import { openTeamThread } from '../navigation';
import { POLLING, TEAM_INVITATIONS_KEY, TEAM_LIST_KEY } from '../queryKeys';
import { formatLastMessageAt, scopeLabel } from '../shared/format';
import { usePollingInterval } from '../shared/usePolling';

/** Invitations en attente : accepter (ouvre le fil) ou refuser. */
export function InvitationsScreen() {
  const styles = useStyles();
  const t = useTheme();
  const queryClient = useQueryClient();
  const interval = usePollingInterval(POLLING.teamInvitations);

  const invitations = useQuery({
    queryKey: TEAM_INVITATIONS_KEY,
    queryFn: ({ signal }) => discussionsApi.listInvitations(signal),
    refetchInterval: interval,
  });

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: TEAM_INVITATIONS_KEY });
    void queryClient.invalidateQueries({ queryKey: TEAM_LIST_KEY });
  };

  const accept = useMutation({
    mutationFn: (invitationId: string) => discussionsApi.acceptInvitation(invitationId),
    onSuccess: (result) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      toast.success('Invitation acceptée.');
      refreshAll();
      openTeamThread(result.conversationId);
    },
    onError: (error) => toast.error(errorMessage(error, "Erreur lors de l'acceptation.")),
  });

  const decline = useMutation({
    mutationFn: (invitationId: string) => discussionsApi.declineInvitation(invitationId),
    onSuccess: () => {
      toast.success('Invitation refusée.');
      refreshAll();
    },
    onError: (error) => toast.error(errorMessage(error, 'Erreur lors du refus.')),
  });

  const busy = accept.isPending || decline.isPending;

  const renderItem = ({ item }: ListRenderItemInfo<GroupConversationPendingInvitation>) => (
    <View style={styles.card}>
      <Text style={styles.title} numberOfLines={2}>
        {item.conversationTitle}
      </Text>
      <Text style={styles.meta}>{scopeLabel(item.scope, item.categoryType, item.brand)}</Text>
      <Text style={styles.meta}>
        Invité par {item.invitedByName}
        {item.invitedByUserCode ? ` (${item.invitedByUserCode})` : ''} ·{' '}
        {formatLastMessageAt(item.createdAt)}
      </Text>
      <View style={styles.actions}>
        <Button
          label="Refuser"
          variant="outline"
          style={styles.action}
          disabled={busy}
          loading={decline.isPending && decline.variables === item.id}
          onPress={() => decline.mutate(item.id)}
        />
        <Button
          label="Accepter"
          style={styles.action}
          disabled={busy}
          loading={accept.isPending && accept.variables === item.id}
          onPress={() => accept.mutate(item.id)}
        />
      </View>
    </View>
  );

  return (
    <FlatList
      data={invitations.data}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      style={styles.root}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      refreshing={invitations.isRefetching && !invitations.isPending}
      onRefresh={() => void invitations.refetch()}
      ListHeaderComponent={
        invitations.error && invitations.data ? (
          <ErrorBanner
            error={invitations.error}
            fallback="Impossible d'actualiser les invitations."
            onRetry={() => void invitations.refetch()}
          />
        ) : undefined
      }
      ListEmptyComponent={
        invitations.isPending ? (
          <ListSkeleton rows={3} height={132} />
        ) : invitations.error ? (
          <ErrorBanner
            error={invitations.error}
            fallback="Impossible de charger les invitations."
            onRetry={() => void invitations.refetch()}
          />
        ) : (
          <EmptyState
            icon={<MailPlus size={28} color={t.textMuted} />}
            title="Aucune invitation"
            text="Les invitations à rejoindre une discussion apparaîtront ici."
          />
        )
      }
    />
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.bg },
  content: { flexGrow: 1, padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['4xl'] },
  card: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  title: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  meta: { fontSize: fontSize.xs, color: t.textMuted },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  action: { flex: 1 },
}));
