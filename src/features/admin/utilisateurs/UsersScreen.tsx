import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Plus, SlidersHorizontal, Users, X } from 'lucide-react-native';

import { ModuleSwitcherButton } from '@/components/modules/ModuleSwitcherButton';
import { Badge, Card } from '@/components/ui';
import { FilterPill } from '@/components/sheet/FilterPill';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { formatRelative } from '@/lib/format';
import { MODULES } from '@/modules/registry';
import { roleLabel } from '@/modules/roles';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { AdminUser } from '@/types/admin';

import { effectiveModules, categoryLabel, warehouseLabel } from '../shared/accessRules';
import { useSubsidiaryOptions } from '../hooks/useAdminOptions';
import { VacationModeCard } from './components/VacationModeCard';
import {
  UNASSIGNED_SUBSIDIARY,
  countActiveAdminUsersFilters,
  patchAdminUsersFilters,
  useAdminUsersFilters,
} from './filtersStore';
import { useAdminUsers } from './hooks/useAdminUsers';
import { filterUsers, isUnassignedPartner, userWarehouseView } from './userHelpers';

/** Liste des comptes : recherche, filtres (feuille), carte par compte, accès à la fiche et à la création. */
export function UsersScreen() {
  const styles = useStyles();
  const t = useTheme();
  const query = useAdminUsers();
  const subsidiaries = useSubsidiaryOptions();
  const filters = useAdminUsersFilters();
  const [search, setSearch] = useState('');
  const { refreshing, onRefresh } = usePullToRefresh(query.refetch);
  const activeCount = countActiveAdminUsersFilters(filters);

  const filtered = useMemo(
    () => filterUsers(query.data ?? [], search, filters),
    [query.data, search, filters],
  );
  const twoFactorCount = filtered.filter((u) => u.twoFactorEnabled).length;
  const subsidiaryName =
    filters.subsidiary === UNASSIGNED_SUBSIDIARY
      ? 'Non rattachés'
      : subsidiaries.data?.find((s) => s.id === filters.subsidiary)?.name ?? 'Filiale';

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Filtres${activeCount > 0 ? `, ${activeCount} actif${activeCount > 1 ? 's' : ''}` : ''}`}
                hitSlop={6}
                onPress={() => router.push('/admin/utilisateurs/filtres')}
                style={styles.headerButton}
              >
                <SlidersHorizontal size={20} color={t.accentText} />
                {activeCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{activeCount}</Text>
                  </View>
                ) : null}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Créer un utilisateur"
                hitSlop={6}
                onPress={() => router.push('/admin/utilisateurs/edition')}
                style={styles.headerButton}
              >
                <Plus size={22} color={t.accentText} />
              </Pressable>
              <ModuleSwitcherButton active="ADMIN" />
            </View>
          ),
        }}
      />
      <Stack.SearchBar
        placeholder="E-mail, nom, code, marque…"
        autoCapitalize="none"
        tintColor={t.accentText}
        hideWhenScrolling={false}
        obscureBackground={false}
        onChangeText={(event) => setSearch(event.nativeEvent.text)}
        onCancelButtonPress={() => setSearch('')}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <UserCard user={item} />}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={8}
        windowSize={9}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={t.accentText}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <VacationModeCard />
            {activeCount > 0 ? (
              <View style={styles.chips}>
                {filters.role ? (
                  <ActiveChip label={roleLabel(filters.role)} onClear={() => patchAdminUsersFilters({ role: '' })} />
                ) : null}
                {filters.warehouse ? (
                  <ActiveChip
                    label={warehouseLabel(filters.warehouse)}
                    onClear={() => patchAdminUsersFilters({ warehouse: '' })}
                  />
                ) : null}
                {filters.subsidiary ? (
                  <ActiveChip label={subsidiaryName} onClear={() => patchAdminUsersFilters({ subsidiary: '' })} />
                ) : null}
                {filters.categories.length > 0 ? (
                  <ActiveChip
                    label={filters.categories.map(categoryLabel).join(', ')}
                    onClear={() => patchAdminUsersFilters({ categories: [] })}
                  />
                ) : null}
              </View>
            ) : null}
            <Text style={styles.total}>
              {query.data ? `${filtered.length} compte${filtered.length > 1 ? 's' : ''}` : 'Chargement…'}
              {query.data && twoFactorCount > 0 ? ` · ${twoFactorCount} avec double authentification` : ''}
            </Text>
            {query.error && filtered.length > 0 ? (
              <ErrorBanner
                error={query.error}
                fallback="Impossible de charger les utilisateurs"
                onRetry={() => void onRefresh()}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? (
            <ListSkeleton rows={4} height={110} />
          ) : query.error ? (
            <ErrorBanner
              error={query.error}
              fallback="Impossible de charger les utilisateurs"
              onRetry={() => void onRefresh()}
            />
          ) : (
            <EmptyState
              icon={<Users size={24} color={t.textMuted} />}
              title="Aucun utilisateur"
              text={
                activeCount > 0 || search
                  ? 'Aucun compte ne correspond à ces filtres.'
                  : "Aucun compte n'a encore été créé."
              }
            />
          )
        }
      />
    </>
  );
}

function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  const t = useTheme();
  return (
    <FilterPill label={label} state="on" onPress={onClear} trailing={<X size={12} color={t.accentText} />} />
  );
}

function UserCard({ user }: { user: AdminUser }) {
  const styles = useStyles();
  const warehouse = userWarehouseView(user);
  const unassigned = isUnassignedPartner(user);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${user.name}, ${roleLabel(user.role)}`}
      onPress={() => router.push({ pathname: '/admin/utilisateurs/[id]', params: { id: user.id } })}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card contentStyle={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={styles.identity}>
            <Text style={styles.name} numberOfLines={1}>
              {user.name}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {user.email}
            </Text>
          </View>
          {!user.isActive ? <Badge label="Inactif" tone="red" /> : null}
        </View>
        <View style={styles.badges}>
          <Badge label={roleLabel(user.role)} tone="blue" />
          {effectiveModules(user.modules).map((id) => (
            <Badge key={id} label={MODULES[id].name} />
          ))}
          {user.twoFactorEnabled ? <Badge label="2FA" tone="green" /> : null}
          {user.mustChangePassword ? <Badge label="Mot de passe à changer" tone="amber" /> : null}
          {user.isOnVacation ? <Badge label="En vacances" tone="amber" /> : null}
          {unassigned ? <Badge label="Non rattaché" tone="amber" /> : null}
        </View>
        <Text style={styles.meta} numberOfLines={2}>
          {[
            user.code ? `Code ${user.code}` : null,
            user.subsidiary?.name ?? null,
            warehouse ? warehouse.label : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'Aucun rattachement'}
        </Text>
        <Text style={styles.meta}>
          {user.lastLoginAt ? `Dernière connexion ${formatRelative(user.lastLoginAt)}` : 'Jamais connecté'}
        </Text>
      </Card>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  content: { flexGrow: 1, paddingBottom: 160, paddingHorizontal: spacing.xl, gap: spacing.md },
  header: { gap: spacing.md, paddingTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  total: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerButton: {
    width: hitTarget - 4,
    height: hitTarget - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.accent,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: t.onAccent },
  pressed: { opacity: 0.85 },
  cardContent: { gap: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  identity: { flex: 1, gap: 2 },
  name: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  email: { fontSize: fontSize.sm, color: t.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  meta: { fontSize: fontSize.xs, color: t.textSubtle },
}));
