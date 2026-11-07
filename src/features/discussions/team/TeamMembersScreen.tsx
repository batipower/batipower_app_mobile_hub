import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Clock, Crown, LogOut, Package, Tag, UserMinus, UserPlus } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { discussionsApi } from '@/api/discussions';
import { useAuth } from '@/auth/AuthProvider';
import { ModuleBadge } from '@/components/modules/ModuleBadge';
import { Button, Card } from '@/components/ui';
import { ErrorBanner, ListSkeleton, errorMessage } from '@/features/preparation/components/ListState';
import { roleLabel } from '@/modules/roles';
import {
  fontSize,
  hitTarget,
  makeStyles,
  monoFontFamily,
  radius,
  spacing,
  useTheme,
  withAlpha,
} from '@/theme';
import type {
  DiscussionEligibleUser,
  GroupConversationDetail,
  GroupConversationParticipant,
} from '@/types/discussions';

import { POLLING, TEAM_LIST_KEY, teamDetailKey } from '../queryKeys';
import { Avatar } from '../shared/Avatar';
import { categoryTypeLabel } from '../shared/format';
import { usePollingInterval } from '../shared/usePolling';
import { UserPicker } from './components/UserPicker';
import { effectiveModules } from './teamHelpers';

/** Nombre maximal de produits listés dans le résumé du sujet (le reste est résumé en « +N »). */
const MAX_PRODUCTS_SHOWN = 8;

/** Membres d'une discussion d'équipe : consultation, invitation, retrait et départ. */
export function TeamMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <TeamMembers conversationId={id} />;
}

function TeamMembers({ conversationId }: { conversationId: string }) {
  const styles = useStyles();
  const t = useTheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const interval = usePollingInterval(POLLING.teamDetail);

  const [inviting, setInviting] = useState(false);
  const [selected, setSelected] = useState<DiscussionEligibleUser[]>([]);

  const detail = useQuery({
    queryKey: teamDetailKey(conversationId),
    queryFn: ({ signal }) => discussionsApi.get(conversationId, signal),
    refetchInterval: interval,
  });
  const conversation = detail.data;

  const currentUserId = user?.id ?? '';
  const isOwner = conversation?.myRole === 'OWNER';
  const archived = !!conversation?.archivedAt;
  const isDirect = conversation?.scope === 'DIRECT';
  const canInvite = !!conversation && !archived && !isDirect;

  // Les personnes déjà membres ou déjà invitées ne sont pas proposées à l'invitation.
  const excludeIds = useMemo(
    () => [
      ...(conversation?.members.map((m) => m.userId) ?? []),
      ...(conversation?.pendingInvitations.map((i) => i.invitedUserId) ?? []),
    ],
    [conversation],
  );

  const refreshAfterChange = () => {
    void queryClient.invalidateQueries({ queryKey: teamDetailKey(conversationId) });
    void queryClient.invalidateQueries({ queryKey: TEAM_LIST_KEY });
  };

  const invite = useMutation({
    mutationFn: () =>
      discussionsApi.inviteMembers(
        conversationId,
        selected.map((u) => u.id),
      ),
    onSuccess: (result) => {
      const parts: string[] = [];
      if (result.invited > 0) {
        parts.push(`${result.invited} invitation${result.invited > 1 ? 's' : ''} envoyée${result.invited > 1 ? 's' : ''}`);
      }
      if (result.alreadyMember > 0) {
        parts.push(`${result.alreadyMember} déjà membre${result.alreadyMember > 1 ? 's' : ''}`);
      }
      if (result.alreadyInvited > 0) {
        parts.push(`${result.alreadyInvited} déjà invité${result.alreadyInvited > 1 ? 's' : ''}`);
      }
      if (result.invited > 0) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => undefined,
        );
        toast.success(parts.join(' · '));
      } else {
        toast(parts.join(' · ') || 'Aucune invitation envoyée.');
      }
      setSelected([]);
      setInviting(false);
      refreshAfterChange();
    },
    onError: (error) => toast.error(errorMessage(error, "Erreur lors de l'invitation.")),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => discussionsApi.removeMember(conversationId, userId),
    onSuccess: (_result, userId) => {
      refreshAfterChange();
      if (userId === currentUserId) {
        toast.success('Vous avez quitté la discussion.');
        // La discussion n'est plus accessible : retour à la liste (et non au fil).
        router.dismissTo('/hub/discussions');
      } else {
        toast.success('Membre retiré.');
      }
    },
    onError: (error) => toast.error(errorMessage(error, 'Erreur lors du retrait.')),
  });

  const confirmRemove = (member: GroupConversationParticipant) => {
    Alert.alert(
      'Retirer ce membre ?',
      `${member.name} n'aura plus accès à cette discussion.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Retirer', style: 'destructive', onPress: () => remove.mutate(member.userId) },
      ],
    );
  };

  const confirmLeave = () => {
    Alert.alert(
      'Quitter la discussion ?',
      'Vous n’aurez plus accès à cette discussion, sauf nouvelle invitation.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Quitter', style: 'destructive', onPress: () => remove.mutate(currentUserId) },
      ],
    );
  };

  if (detail.isPending) {
    return (
      <View style={styles.root}>
        <ListSkeleton rows={4} height={72} />
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={styles.root}>
        <ErrorBanner
          error={detail.error}
          fallback="Impossible de charger la discussion."
          onRetry={() => void detail.refetch()}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      <ScopeSummary conversation={conversation} />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Membres ({conversation.members.length})
          </Text>
          {canInvite ? (
            <Pressable
              onPress={() => setInviting((open) => !open)}
              accessibilityRole="button"
              accessibilityState={{ expanded: inviting }}
              accessibilityLabel={inviting ? "Fermer l'invitation" : 'Inviter des membres'}
              style={styles.inviteButton}
              hitSlop={6}
            >
              <UserPlus size={15} color={t.accentText} />
              <Text style={styles.inviteText}>{inviting ? 'Fermer' : 'Inviter'}</Text>
            </Pressable>
          ) : null}
        </View>

        {archived ? (
          <Text style={styles.hint}>Discussion archivée : les invitations sont désactivées.</Text>
        ) : null}

        {inviting && canInvite ? (
          <Card>
            <View style={styles.inviteBody}>
              <Text style={styles.hint}>
                Sélectionnez les personnes à inviter. Elles devront accepter l&apos;invitation.
              </Text>
              <UserPicker selected={selected} onChange={setSelected} excludeIds={excludeIds} />
              <Button
                label={
                  selected.length > 0
                    ? `Inviter ${selected.length} personne${selected.length > 1 ? 's' : ''}`
                    : 'Inviter'
                }
                disabled={selected.length === 0}
                loading={invite.isPending}
                onPress={() => invite.mutate()}
              />
            </View>
          </Card>
        ) : null}

        <View style={styles.list}>
          {conversation.members.map((member, index) => (
            <MemberRow
              key={member.userId}
              member={member}
              isMe={member.userId === currentUserId}
              canRemove={isOwner && !isDirect && member.userId !== currentUserId}
              busy={remove.isPending}
              last={index === conversation.members.length - 1}
              onRemove={confirmRemove}
            />
          ))}
        </View>
      </View>

      {conversation.pendingInvitations.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Invitations en attente ({conversation.pendingInvitations.length})
          </Text>
          <View style={styles.pendingList}>
            {conversation.pendingInvitations.map((invitation) => (
              <View
                key={invitation.id}
                style={styles.pending}
                accessible
                accessibilityLabel={`${invitation.invitedUserName}, invité par ${invitation.invitedByName}`}
              >
                <Clock size={15} color={t.warning} />
                <View style={styles.pendingTexts}>
                  <Text style={styles.pendingName} numberOfLines={1}>
                    {invitation.invitedUserName}
                  </Text>
                  <Text style={styles.pendingBy} numberOfLines={1}>
                    Invité par {invitation.invitedByName}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {!isDirect ? (
        <Button
          label="Quitter la discussion"
          variant="outline"
          destructive
          loading={remove.isPending && remove.variables === currentUserId}
          disabled={remove.isPending}
          leadingIcon={<LogOut size={16} color={t.danger} />}
          onPress={confirmLeave}
        />
      ) : null}
    </ScrollView>
  );
}

/** Résumé du sujet de la discussion (service, marque ou produits). */
function ScopeSummary({ conversation }: { conversation: GroupConversationDetail }) {
  const styles = useStyles();
  const t = useTheme();

  if (conversation.scope === 'FREE' || conversation.scope === 'DIRECT') return null;

  const products = conversation.products;
  return (
    <Card>
      <Text style={styles.scopeLabel}>
        {conversation.scope === 'CATEGORY'
          ? 'Service'
          : conversation.scope === 'BRAND'
            ? 'Marque'
            : 'Produits'}
      </Text>
      {conversation.scope === 'CATEGORY' ? (
        <Text style={styles.scopeValue}>{categoryTypeLabel(conversation.categoryType)}</Text>
      ) : conversation.scope === 'BRAND' ? (
        <View style={styles.brandRow}>
          <Tag size={15} color={t.accentText} />
          <Text style={[styles.scopeValue, styles.brandValue]}>{conversation.brand ?? '—'}</Text>
        </View>
      ) : (
        <View style={styles.products}>
          {products.length === 0 ? (
            <Text style={styles.hint}>Aucun produit</Text>
          ) : (
            products.slice(0, MAX_PRODUCTS_SHOWN).map((product) => (
              <View key={product.reference} style={styles.product}>
                <Package size={14} color={t.textMuted} />
                <View style={styles.productTexts}>
                  <Text style={styles.productRef}>{product.reference}</Text>
                  {product.designation ? (
                    <Text style={styles.productDesignation} numberOfLines={1}>
                      {product.designation}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))
          )}
          {products.length > MAX_PRODUCTS_SHOWN ? (
            <Text style={styles.hint}>
              +{products.length - MAX_PRODUCTS_SHOWN} autre
              {products.length - MAX_PRODUCTS_SHOWN > 1 ? 's' : ''}
            </Text>
          ) : null}
        </View>
      )}
    </Card>
  );
}

type MemberRowProps = {
  member: GroupConversationParticipant;
  isMe: boolean;
  canRemove: boolean;
  busy: boolean;
  last: boolean;
  onRemove: (member: GroupConversationParticipant) => void;
};

function MemberRow({ member, isMe, canRemove, busy, last, onRemove }: MemberRowProps) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={[styles.member, isMe && styles.memberMe, !last && styles.memberDivider]}>
      <Avatar name={member.name} size={38} />
      <View style={styles.memberTexts}>
        <View style={styles.memberTitle}>
          <Text style={styles.memberName} numberOfLines={1}>
            {member.name}
            {isMe ? <Text style={styles.memberYou}> (vous)</Text> : null}
          </Text>
          {member.memberRole === 'OWNER' ? (
            <View accessible accessibilityLabel="Propriétaire">
              <Crown size={14} color={t.warning} />
            </View>
          ) : null}
        </View>
        <View style={styles.memberSub}>
          <Text style={styles.memberRole} numberOfLines={1}>
            {roleLabel(member.role)}
            {member.code ? ` · ${member.code}` : ''}
          </Text>
          {effectiveModules(member.modules).map((module) => (
            <ModuleBadge key={module} module={module} size="sm" />
          ))}
        </View>
      </View>
      {canRemove ? (
        <Pressable
          onPress={() => onRemove(member)}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`Retirer ${member.name}`}
          style={({ pressed }) => [styles.removeButton, pressed && styles.removePressed]}
        >
          <UserMinus size={18} color={t.danger} />
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.bg },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing['4xl'] },
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: t.textMuted,
  },
  hint: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  inviteButton: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
  },
  inviteText: { fontSize: fontSize.sm, fontWeight: '700', color: t.accentText },
  inviteBody: { gap: spacing.md },
  list: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    overflow: 'hidden',
  },
  member: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.sm,
  },
  memberMe: { backgroundColor: withAlpha(t.accent, 0.06) },
  memberDivider: { borderBottomWidth: 1, borderBottomColor: t.border },
  memberTexts: { flex: 1, gap: 2 },
  memberTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  memberName: { flexShrink: 1, fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  memberYou: { fontWeight: '400', color: t.textMuted },
  memberSub: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs + 2 },
  memberRole: { flexShrink: 1, fontSize: fontSize.xs, color: t.textMuted },
  removeButton: {
    width: hitTarget,
    height: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  removePressed: { backgroundColor: withAlpha(t.danger, 0.12) },
  pendingList: { gap: spacing.sm },
  pending: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(t.warning, 0.4),
    backgroundColor: withAlpha(t.warning, 0.1),
  },
  pendingTexts: { flex: 1, gap: 2 },
  pendingName: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  pendingBy: { fontSize: fontSize.xs, color: t.textMuted },
  scopeLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: t.textMuted,
  },
  scopeValue: { marginTop: spacing.xs, fontSize: fontSize.base, fontWeight: '700', color: t.text },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, marginTop: spacing.xs },
  brandValue: { marginTop: 0, textTransform: 'uppercase', letterSpacing: 0.4 },
  products: { marginTop: spacing.sm, gap: spacing.sm },
  product: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  productTexts: { flex: 1 },
  productRef: { fontSize: 11, fontWeight: '700', fontFamily: monoFontFamily, color: t.accentText },
  productDesignation: { fontSize: 11, color: t.textMuted },
}));
