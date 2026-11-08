import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { AlertTriangle, Building2, KeyRound, Plus } from 'lucide-react-native';

import { ModuleSwitcherButton } from '@/components/modules/ModuleSwitcherButton';
import { FilterPill } from '@/components/sheet/FilterPill';
import { Badge, Card } from '@/components/ui';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { AdminDistributor } from '@/types/adminPartners';

import { StatCard, StatRow } from '../shared/components/StatCard';
import { DistributorLogo } from './components';
import { useDistributors, useEbatproAccounts } from './hooks';
import { FILTER_LABELS, distributorAlerts, matchesFilter, matchesSearch, type DistributorFilter } from './utils';

/** Liste des distributeurs : recherche, filtres de configuration, indicateurs et création. */
export function DistributorsScreen() {
  const styles = useStyles();
  const t = useTheme();
  const query = useDistributors();
  const ebatpro = useEbatproAccounts();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<DistributorFilter>('all');
  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await Promise.all([query.refetch(), ebatpro.refetch()]);
  });

  const all = query.data;
  const items = useMemo(
    () =>
      (all ?? [])
        .filter((d) => matchesFilter(d, filter) && matchesSearch(d, search))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [all, filter, search],
  );
  const counts = useMemo(() => {
    const base = (all ?? []).filter((d) => matchesSearch(d, search));
    return Object.fromEntries(
      FILTER_LABELS.map(({ key }) => [key, base.filter((d) => matchesFilter(d, key)).length]),
    ) as Record<DistributorFilter, number>;
  }, [all, search]);
  const kpis = useMemo(() => {
    const list = all ?? [];
    return {
      distributors: list.length,
      warehouses: list.reduce((s, d) => s + d.warehouses.length, 0),
      subsidiaries: list.reduce((s, d) => s + d.subsidiaryCount, 0),
      anomalies: list.filter((d) => {
        const a = distributorAlerts(d);
        return a.incomplete || a.ordersClosed;
      }).length,
    };
  }, [all]);
  const unlinked = (ebatpro.data?.accounts ?? []).filter((a) => !a.distributorWarehouseId).length;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Nouveau distributeur"
                hitSlop={8}
                onPress={() => router.push('/admin/partenaires/distributeur-formulaire')}
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
        placeholder="Distributeur, entrepôt, filiale…"
        autoCapitalize="none"
        tintColor={t.accentText}
        hideWhenScrolling={false}
        obscureBackground={false}
        onChangeText={(event) => setSearch(event.nativeEvent.text)}
        onCancelButtonPress={() => setSearch('')}
      />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DistributorCard distributor={item} />}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={9}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={t.accentText} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <StatRow>
              <StatCard label="Distributeurs" value={kpis.distributors} />
              <StatCard label="Entrepôts" value={kpis.warehouses} />
              <StatCard label="Filiales" value={kpis.subsidiaries} />
              <StatCard label="Anomalies" value={kpis.anomalies} tone={kpis.anomalies ? 'warning' : 'default'} />
            </StatRow>
            {ebatpro.data && !ebatpro.data.encryptionAvailable ? (
              <View style={styles.banner}>
                <AlertTriangle size={16} color={t.danger} />
                <Text style={styles.bannerText}>
                  Chiffrement eBatPro indisponible (clé serveur manquante) : création et modification des comptes impossibles.
                </Text>
              </View>
            ) : null}
            {unlinked > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/admin/partenaires/comptes-ebatpro')}
                style={styles.unlinked}
              >
                <KeyRound size={16} color={t.warning} />
                <Text style={styles.unlinkedText}>
                  {unlinked} compte{unlinked > 1 ? 's' : ''} eBatPro non rattaché{unlinked > 1 ? 's' : ''}
                </Text>
              </Pressable>
            ) : null}
            <View style={styles.pills}>
              {FILTER_LABELS.map(({ key, label }) => (
                <FilterPill
                  key={key}
                  label={`${label} (${counts[key]})`}
                  state={filter === key ? 'on' : 'off'}
                  onPress={() => setFilter(key)}
                />
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? (
            <ListSkeleton rows={4} height={110} />
          ) : query.error ? (
            <ErrorBanner error={query.error} fallback="Impossible de charger les distributeurs" onRetry={() => void onRefresh()} />
          ) : (
            <EmptyState
              icon={<Building2 size={24} color={t.textMuted} />}
              title="Aucun distributeur"
              text={search || filter !== 'all' ? 'Aucun distributeur pour ce filtre.' : 'Aucun distributeur.'}
            />
          )
        }
      />
    </>
  );
}

function DistributorCard({ distributor: d }: { distributor: AdminDistributor }) {
  const styles = useStyles();
  const alerts = distributorAlerts(d);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={d.name}
      onPress={() => router.push({ pathname: '/admin/partenaires/[id]', params: { id: d.id } })}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card contentStyle={styles.cardContent}>
        <View style={styles.top}>
          <DistributorLogo logo={d} label={d.name} />
          <View style={styles.identity}>
            <Text style={styles.name} numberOfLines={1}>
              {d.name}
            </Text>
            <Text style={styles.sub}>
              {d.warehouses.length} entrepôt{d.warehouses.length > 1 ? 's' : ''} · {d.subsidiaryCount} filiale
              {d.subsidiaryCount > 1 ? 's' : ''} · {d.userCount} utilisateur{d.userCount > 1 ? 's' : ''}
            </Text>
          </View>
          <Badge label={d.isActive ? 'Actif' : 'Inactif'} tone={d.isActive ? 'green' : 'neutral'} />
        </View>
        {alerts.incomplete || alerts.ordersClosed || alerts.negoPaused || d.opportunityAccess === 'DEP_ONLY' ? (
          <View style={styles.badges}>
            {alerts.incomplete ? <Badge label="Config incomplète" tone="amber" /> : null}
            {alerts.ordersClosed ? <Badge label="Commandes coupées" tone="red" /> : null}
            {alerts.negoPaused ? <Badge label="Déploiement en pause" tone="amber" /> : null}
            {d.opportunityAccess === 'DEP_ONLY' ? <Badge label="DEP uniquement" tone="purple" /> : null}
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  content: { flexGrow: 1, paddingBottom: 160, paddingHorizontal: spacing.xl, gap: spacing.md },
  header: { gap: spacing.md, paddingTop: spacing.sm },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.danger,
  },
  bannerText: { flex: 1, fontSize: fontSize.xs, lineHeight: 17, color: t.danger },
  unlinked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.warning,
  },
  unlinkedText: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: t.warning },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pressed: { opacity: 0.85 },
  cardContent: { gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identity: { flex: 1, gap: 2 },
  name: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  sub: { fontSize: fontSize.xs, color: t.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
}));
