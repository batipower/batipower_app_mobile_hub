import { memo, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react-native';

import { discussionsApi } from '@/api/discussions';
import { ModuleBadge } from '@/components/modules/ModuleBadge';
import { errorMessage } from '@/features/preparation/components/ListState';
import { useDebouncedTerm } from '@/features/search/hooks/useDebouncedTerm';
import { roleLabel } from '@/modules/roles';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { DiscussionEligibleUser } from '@/types/discussions';

import { teamPickerKey } from '../../queryKeys';
import { Avatar } from '../../shared/Avatar';
import { effectiveModules } from '../teamHelpers';
import { SearchField } from './SearchField';
import { SelectableRow } from './SelectableRow';

/** Nombre maximal de résultats affichés : au-delà, on invite à affiner la recherche. */
const MAX_VISIBLE = 40;

type UserRowProps = {
  user: DiscussionEligibleUser;
  selected: boolean;
  mode: 'checkbox' | 'radio';
  onToggle: (user: DiscussionEligibleUser) => void;
};

const UserRow = memo(function UserRow({ user, selected, mode, onToggle }: UserRowProps) {
  const styles = useStyles();
  return (
    <SelectableRow
      selected={selected}
      mode={mode}
      onPress={() => onToggle(user)}
      accessibilityLabel={`${user.name}, ${roleLabel(user.role)}`}
    >
      <View style={styles.person}>
        <Avatar name={user.name} size={36} />
        <View style={styles.texts}>
          <Text style={styles.name} numberOfLines={1}>
            {user.name}
          </Text>
          <View style={styles.subline}>
            <Text style={styles.role} numberOfLines={1}>
              {roleLabel(user.role)}
              {user.code ? ` · ${user.code}` : ''}
            </Text>
            {effectiveModules(user.modules).map((module) => (
              <ModuleBadge key={module} module={module} size="sm" />
            ))}
          </View>
        </View>
      </View>
    </SelectableRow>
  );
});

type UserPickerProps = {
  selected: readonly DiscussionEligibleUser[];
  onChange: (users: DiscussionEligibleUser[]) => void;
  /** Comptes à masquer (membres déjà présents). */
  excludeIds?: readonly string[];
  /** Sélection unique (message direct) : choisir un compte remplace le précédent. */
  single?: boolean;
};

/**
 * Sélecteur de comptes éligibles (`discussions/eligible-users`) : recherche côté serveur avec
 * délai, puces des comptes choisis et liste à cocher. À placer dans un défilement
 * (`keyboardShouldPersistTaps="handled"`).
 */
export function UserPicker({ selected, onChange, excludeIds, single = false }: UserPickerProps) {
  const styles = useStyles();
  const t = useTheme();
  const [text, setText] = useState('');
  const term = useDebouncedTerm(text);

  const query = useQuery({
    queryKey: teamPickerKey('users', term),
    queryFn: ({ signal }) => discussionsApi.searchEligibleUsers(term || undefined, signal),
    staleTime: 30_000,
  });

  const selectedIds = useMemo(() => new Set(selected.map((u) => u.id)), [selected]);
  const results = useMemo(() => {
    const excluded = new Set(excludeIds ?? []);
    return (query.data ?? []).filter((u) => !excluded.has(u.id));
  }, [query.data, excludeIds]);

  const toggle = (user: DiscussionEligibleUser) => {
    if (selectedIds.has(user.id)) onChange(selected.filter((u) => u.id !== user.id));
    else onChange(single ? [user] : [...selected, user]);
  };

  return (
    <View style={styles.root}>
      <SearchField value={text} onChangeText={setText} placeholder="Rechercher un utilisateur" />

      {selected.length > 0 ? (
        <View style={styles.chips}>
          {selected.map((user) => (
            <Pressable
              key={user.id}
              onPress={() => toggle(user)}
              accessibilityRole="button"
              accessibilityLabel={`Retirer ${user.name}`}
              hitSlop={6}
              style={styles.chip}
            >
              <Text style={styles.chipText} numberOfLines={1}>
                {user.name}
              </Text>
              <X size={13} color={t.accentText} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.list}>
        {query.isPending ? (
          <View style={styles.state}>
            <ActivityIndicator color={t.accentText} />
          </View>
        ) : query.error && results.length === 0 ? (
          <Text style={styles.stateText} accessibilityRole="alert">
            {errorMessage(query.error, 'Impossible de rechercher les utilisateurs.')}
          </Text>
        ) : results.length === 0 ? (
          <Text style={styles.stateText}>
            {term ? 'Aucun utilisateur ne correspond.' : 'Aucun utilisateur disponible.'}
          </Text>
        ) : (
          <>
            {results.slice(0, MAX_VISIBLE).map((user) => (
              <UserRow
                key={user.id}
                user={user}
                selected={selectedIds.has(user.id)}
                mode={single ? 'radio' : 'checkbox'}
                onToggle={toggle}
              />
            ))}
            {results.length > MAX_VISIBLE ? (
              <Text style={styles.stateText}>
                {results.length - MAX_VISIBLE} autres résultats : affinez la recherche.
              </Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    maxWidth: '100%',
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: withAlpha(t.accent, 0.5),
    backgroundColor: withAlpha(t.accent, 0.14),
  },
  chipText: { flexShrink: 1, fontSize: fontSize.xs, fontWeight: '700', color: t.accentText },
  list: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    overflow: 'hidden',
  },
  state: { padding: spacing['2xl'], alignItems: 'center' },
  stateText: {
    padding: spacing.lg,
    fontSize: fontSize.xs,
    textAlign: 'center',
    color: t.textMuted,
  },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1, gap: 2 },
  name: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  subline: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs + 2 },
  role: { flexShrink: 1, fontSize: 11, color: t.textMuted },
}));
