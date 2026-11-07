import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { MessageSquarePlus } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { ModuleSwitcherButton } from '@/components/modules/ModuleSwitcherButton';
import { SearchBar } from '@/features/preparation/components/SearchBar';
import { SegmentedControl, type Segment } from '@/features/preparation/components/SegmentedControl';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';

import { ClientInbox } from './clients/ClientInbox';
import { useDiscussionsUnread } from './hooks/useDiscussionsUnread';
import { openNewDiscussion } from './navigation';
import { TeamInbox } from './team/TeamInbox';

type InboxKind = 'team' | 'clients';

const PLACEHOLDER: Record<InboxKind, string> = {
  team: 'Titre, service, marque…',
  clients: 'Client, e-mail…',
};

/**
 * Discussions du HUB : liste segmentée Équipe (discussions internes, `discussions/*`) et
 * Clients (messages du site, `support-chat/staff/*`).
 *
 * Comme Cockpit et Préparation, l'écran n'a pas d'en-tête natif : son titre, le contrôle
 * segmenté (avec les non-lus des deux flux) et le champ de recherche sont posés dès le haut de
 * la zone sûre, et la liste occupe tout le reste. Un grand titre natif avec sa barre de
 * recherche mangeait ~100 pt et repoussait la première conversation sous le milieu de l'écran.
 */
export function DiscussionsScreen() {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const unread = useDiscussionsUnread(!!user);
  const [inbox, setInbox] = useState<InboxKind>('team');
  const [search, setSearch] = useState('');

  if (!user) return null;

  const segments: Segment<InboxKind>[] = [
    { key: 'team', label: 'Équipe', count: unread.teamUnread > 0 ? unread.teamUnread : undefined },
    {
      key: 'clients',
      label: 'Clients',
      count: unread.clientsUnread > 0 ? unread.clientsUnread : undefined,
    },
  ];
  // La saisie d'un flux ne reste pas dans l'autre.
  const changeInbox = (next: InboxKind) => {
    setInbox(next);
    setSearch('');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Discussions
        </Text>
        <View style={styles.headerActions}>
          {inbox === 'team' ? (
            <Pressable
              style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel="Nouvelle discussion"
              hitSlop={6}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
                openNewDiscussion();
              }}
            >
              <MessageSquarePlus size={20} color={t.onAccent} />
            </Pressable>
          ) : null}
          <ModuleSwitcherButton active="HUB" />
        </View>
      </View>

      <View style={styles.block}>
        <SegmentedControl segments={segments} value={inbox} onChange={changeInbox} />
      </View>
      <View style={styles.block}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={PLACEHOLDER[inbox]} />
      </View>

      {inbox === 'team' ? <TeamInbox search={search} /> : <ClientInbox search={search} />}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.bg, gap: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  title: { flex: 1, fontSize: fontSize['3xl'], fontWeight: '700', color: t.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  block: { paddingHorizontal: spacing.xl },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: t.accent,
  },
  addButtonPressed: { backgroundColor: t.accentPressed, transform: [{ scale: 0.95 }] },
}));
