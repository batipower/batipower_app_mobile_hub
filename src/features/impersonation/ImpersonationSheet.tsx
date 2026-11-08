import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner-native';
import { Check, ChevronRight, ShieldAlert, UserX } from 'lucide-react-native';

import { authApi } from '@/api/auth';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { canImpersonate } from '@/auth/permissions';
import { ModuleBadge } from '@/components/modules/ModuleBadge';
import { useSheetKeyboard } from '@/components/sheet/useSheetKeyboard';
import { Badge, Chip } from '@/components/ui';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { SearchBar } from '@/features/preparation/components/SearchBar';
import { normalizeForSearch } from '@/features/preparation/orderHelpers';
import { accessibleModules } from '@/modules/registry';
import { roleLabel } from '@/modules/roles';
import {
  fontSize,
  hitTarget,
  makeStyles,
  radius,
  spacing,
  typography,
  useTheme,
  withAlpha,
} from '@/theme';
import type { AppUserRole, ImpersonableUser } from '@/types/user';

const IMPERSONABLE_USERS_KEY = ['impersonable-users'] as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0]];
  return letters
    .map((part) => part?.charAt(0) ?? '')
    .join('')
    .toUpperCase();
}

/**
 * Choix du compte à usurper, présenté en feuille native. Réservé au SUPERADMIN ; pendant une
 * impersonation, l'écran reste ouvert au compte réellement connecté (qui est SUPERADMIN) pour
 * passer directement d'un profil à l'autre.
 */
export function ImpersonationSheet() {
  const { user, isImpersonating } = useAuth();
  if (!user) return null;
  // Pendant une impersonation, `user` est le compte usurpé : seul le SUPERADMIN a pu la démarrer.
  if (!canImpersonate(user.role) && !isImpersonating) {
    return (
      <AccessDenied
        title="Accès réservé"
        text="L'impersonation est réservée aux comptes Super Admin."
      />
    );
  }
  return <ImpersonationList />;
}

function ImpersonationList() {
  const styles = useStyles();
  const t = useTheme();
  const { user, startImpersonation } = useAuth();
  const { rootStyle, restingPadding } = useSheetKeyboard();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<AppUserRole | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: IMPERSONABLE_USERS_KEY,
    queryFn: () => authApi.listImpersonableUsers(),
    staleTime: 60_000,
  });

  // Comme sur le web : comptes actifs, hors SUPERADMIN.
  const candidates = useMemo(
    () => (query.data ?? []).filter((item) => item.isActive && item.role !== 'SUPERADMIN'),
    [query.data],
  );

  const roles = useMemo(() => {
    const counts = new Map<AppUserRole, number>();
    for (const item of candidates) counts.set(item.role, (counts.get(item.role) ?? 0) + 1);
    return [...counts.entries()].sort(([a], [b]) => roleLabel(a).localeCompare(roleLabel(b), 'fr'));
  }, [candidates]);

  const visible = useMemo(() => {
    const needle = normalizeForSearch(search);
    return candidates.filter((item) => {
      if (role && item.role !== role) return false;
      if (!needle) return true;
      return normalizeForSearch(`${item.name} ${item.email} ${item.code ?? ''}`).includes(needle);
    });
  }, [candidates, role, search]);

  const start = (target: ImpersonableUser) => {
    setPendingId(target.id);
    startImpersonation(target.id)
      .catch((error: unknown) => {
        toast.error(error instanceof ApiError ? error.message : 'Impossible de changer de compte.');
      })
      .finally(() => setPendingId(null));
  };

  const confirm = (target: ImpersonableUser) => {
    Alert.alert(
      `Se connecter en tant que ${target.name} ?`,
      `L'application s'ouvrira avec le rôle « ${roleLabel(target.role)} ». Cette action est tracée.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Continuer', onPress: () => start(target) },
      ],
    );
  };

  return (
    <Animated.View style={[styles.sheet, rootStyle]}>
      <Text style={styles.title} accessibilityRole="header">
        Se connecter en tant que
      </Text>

      <View style={styles.notice}>
        <ShieldAlert size={16} color={t.warning} />
        <Text style={styles.noticeText}>
          {`Réservé aux tests et au support. Chaque session d'impersonation est tracée ; vous en sortez à tout moment depuis la pastille orange ou le profil.`}
        </Text>
      </View>

      <View style={styles.search}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Nom, email ou code" />
      </View>

      {roles.length > 1 ? (
        <View style={styles.chipsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            accessibilityRole="tablist"
          >
            <Chip
              label="Tous"
              count={candidates.length}
              active={!role}
              onPress={() => setRole(null)}
            />
            {roles.map(([key, count]) => (
              <Chip
                key={key}
                label={roleLabel(key)}
                count={count}
                active={role === key}
                onPress={() => setRole(key)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <FlatList<ImpersonableUser>
        data={visible}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: restingPadding + spacing['2xl'] }]}
        renderItem={({ item }) => (
          <UserRow
            item={item}
            current={item.id === user?.id}
            pending={pendingId === item.id}
            disabled={pendingId !== null}
            onPress={() => confirm(item)}
          />
        )}
        ListHeaderComponent={
          query.isError ? (
            <ErrorBanner
              error={query.error}
              fallback="Impossible de charger les comptes"
              onRetry={() => void query.refetch()}
            />
          ) : query.isPending ? (
            <ListSkeleton rows={5} height={72} />
          ) : undefined
        }
        ListEmptyComponent={
          query.isSuccess ? (
            <EmptyState
              icon={<UserX size={24} color={t.textMuted} />}
              title="Aucun compte"
              text="Aucun compte actif ne correspond à cette recherche."
            />
          ) : undefined
        }
      />
    </Animated.View>
  );
}

type UserRowProps = {
  item: ImpersonableUser;
  /** Le compte actuellement usurpé. */
  current: boolean;
  pending: boolean;
  disabled: boolean;
  onPress: () => void;
};

function UserRow({ item, current, pending, disabled, onPress }: UserRowProps) {
  const styles = useStyles();
  const t = useTheme();
  const modules = accessibleModules(item);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${roleLabel(item.role)}`}
      accessibilityHint="Se connecter en tant que ce compte"
      accessibilityState={{ selected: current, busy: pending, disabled }}
      style={({ pressed }) => [
        styles.row,
        current && styles.rowCurrent,
        pressed && styles.rowPressed,
        disabled && !pending && styles.rowDisabled,
      ]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(item.name)}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {item.email}
        </Text>
        <View style={styles.badges}>
          <Badge label={roleLabel(item.role)} />
          {modules.map((id) => (
            <ModuleBadge key={id} module={id} size="sm" />
          ))}
        </View>
      </View>
      {pending ? (
        <ActivityIndicator color={t.accentText} />
      ) : current ? (
        <Check size={18} color={t.accentText} />
      ) : (
        <ChevronRight size={18} color={t.textFaint} />
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  sheet: { flex: 1, backgroundColor: t.bgElevated, paddingTop: spacing['2xl'], gap: spacing.md },
  title: { ...typography.label, color: t.textSubtle, paddingHorizontal: spacing.xl },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(t.warning, 0.3),
    backgroundColor: withAlpha(t.warning, 0.08),
  },
  noticeText: { flex: 1, fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  search: { paddingHorizontal: spacing.xl },
  chipsWrap: { minHeight: 36 },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.xl },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing['4xl'], gap: spacing.xs },
  row: {
    minHeight: hitTarget + 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  rowCurrent: { backgroundColor: withAlpha(t.accent, 0.12) },
  rowPressed: { backgroundColor: t.surfaceStrong },
  rowDisabled: { opacity: 0.5 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(t.accent, 0.12),
    borderWidth: 1,
    borderColor: withAlpha(t.accent, 0.3),
  },
  avatarText: { fontSize: fontSize.sm, fontWeight: '700', color: t.accentText },
  rowBody: { flex: 1, gap: 2 },
  name: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  email: { fontSize: fontSize.xs, color: t.textSubtle },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 3 },
}));
