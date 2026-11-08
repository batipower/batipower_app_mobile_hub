import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Switch, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Activity, Download } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

import { adminAccountsApi } from '@/api/adminAccounts';
import { FilterPill } from '@/components/sheet/FilterPill';
import { Badge, Card } from '@/components/ui';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { SegmentedControl } from '@/features/preparation/components/SegmentedControl';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { normalizeForSearch } from '@/features/preparation/orderHelpers';
import { formatDateTime, formatInteger, formatRelative } from '@/lib/format';
import { roleLabel } from '@/modules/roles';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { ExportDownloadEntry, UserActivitySummary } from '@/types/admin';

import { adminActivityKey, adminExportsKey } from '../queryKeys';
import { StatCard, StatRow } from '../shared/components/StatCard';

type TabKey = 'users' | 'exports';

const PERIODS = [7, 30, 90] as const;

const COUNTRY_LABELS: Record<string, string> = {
  FR: 'France',
  IT: 'Italie',
  ES: 'Espagne',
  DE: 'Allemagne',
  BE: 'Belgique',
};

/** Activité des utilisateurs sur une période (connexions, actions produit, exports négo). */
export function ActivityScreen() {
  const t = useTheme();
  const styles = useStyles();
  const [tab, setTab] = useState<TabKey>('users');
  const [days, setDays] = useState<number>(30);
  const [activeOnly, setActiveOnly] = useState(false);
  const [search, setSearch] = useState('');

  const activity = useQuery({
    queryKey: adminActivityKey(days, activeOnly),
    queryFn: () => adminAccountsApi.getUsersActivity({ days, activeOnly }),
  });
  const exportsQuery = useQuery({
    queryKey: adminExportsKey(days),
    queryFn: () => adminAccountsApi.getExportDownloads({ days }),
  });

  const current = tab === 'users' ? activity : exportsQuery;
  const { refreshing, onRefresh } = usePullToRefresh(current.refetch);

  const header = (
    <View style={styles.header}>
      <SegmentedControl<TabKey>
        segments={[
          { key: 'users', label: 'Utilisateurs' },
          { key: 'exports', label: 'Exports négo', count: exportsQuery.data?.length },
        ]}
        value={tab}
        onChange={setTab}
      />
      <View style={styles.pills}>
        {PERIODS.map((p) => (
          <FilterPill key={p} label={`${p} jours`} state={days === p ? 'on' : 'off'} onPress={() => setDays(p)} />
        ))}
      </View>
      {tab === 'users' ? (
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Actifs sur la période uniquement</Text>
          <Switch
            value={activeOnly}
            onValueChange={setActiveOnly}
            trackColor={{ true: t.accent, false: t.surfaceStrong }}
            accessibilityLabel="Actifs sur la période uniquement"
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <>
      <Stack.SearchBar
        placeholder={tab === 'users' ? 'E-mail, nom, code…' : 'Utilisateur, marque…'}
        autoCapitalize="none"
        tintColor={t.accentText}
        hideWhenScrolling={false}
        obscureBackground={false}
        onChangeText={(event) => setSearch(event.nativeEvent.text)}
        onCancelButtonPress={() => setSearch('')}
      />
      {tab === 'users' ? (
        <UsersActivityList
          rows={activity.data}
          loading={activity.isLoading}
          error={activity.error}
          search={search}
          days={days}
          header={header}
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
        />
      ) : (
        <ExportsList
          rows={exportsQuery.data}
          loading={exportsQuery.isLoading}
          error={exportsQuery.error}
          search={search}
          days={days}
          header={header}
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
        />
      )}
    </>
  );
}

type ListProps<T> = {
  rows: T[] | undefined;
  loading: boolean;
  error: unknown;
  search: string;
  days: number;
  header: React.ReactElement;
  refreshing: boolean;
  onRefresh: () => void;
};

function UsersActivityList({ rows, loading, error, search, days, header, refreshing, onRefresh }: ListProps<UserActivitySummary>) {
  const styles = useStyles();
  const t = useTheme();

  const filtered = useMemo(() => {
    const q = normalizeForSearch(search.trim());
    if (!rows) return [];
    if (!q) return rows;
    return rows.filter(
      (u) =>
        normalizeForSearch(u.email).includes(q) ||
        normalizeForSearch(u.name).includes(q) ||
        normalizeForSearch(u.code ?? '').includes(q),
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const all = rows ?? [];
    const approved = all.filter((u) => u.registrationStatus === 'APPROVED' && u.isActive);
    return {
      total: all.length,
      activeInPeriod: all.filter((u) => u.wasActiveInPeriod).length,
      neverConnected: approved.filter((u) => !u.lastLoginAt).length,
      approved: approved.length,
    };
  }, [rows]);

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ActivityCard row={item} />}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      initialNumToRender={8}
      windowSize={9}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accentText} />}
      ListHeaderComponent={
        <View style={styles.headerWrap}>
          {header}
          <StatRow>
            <StatCard label="Comptes" value={stats.total} />
            <StatCard label={`Actifs (${days} j)`} value={stats.activeInPeriod} tone="success" />
            <StatCard label="Jamais connectés" value={stats.neverConnected} tone={stats.neverConnected ? 'warning' : 'default'} />
          </StatRow>
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <ListSkeleton rows={4} height={110} />
        ) : error ? (
          <ErrorBanner error={error} fallback="Impossible de charger l'activité" onRetry={onRefresh} />
        ) : (
          <EmptyState icon={<Activity size={24} color={t.textMuted} />} title="Aucun compte" text="Aucun utilisateur ne correspond à la recherche." />
        )
      }
    />
  );
}

function ActivityStatus({ row }: { row: UserActivitySummary }) {
  if (!row.isActive) return <Badge label="Compte inactif" />;
  if (row.registrationStatus !== 'APPROVED') return <Badge label={row.registrationStatus} tone="amber" />;
  if (row.wasActiveInPeriod) return <Badge label="Actif" tone="green" />;
  return <Badge label="Inactif sur la période" />;
}

function ActivityCard({ row }: { row: UserActivitySummary }) {
  const styles = useStyles();
  return (
    <Card contentStyle={styles.cardContent}>
      <View style={styles.cardTop}>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {row.name}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {row.email}
          </Text>
        </View>
        <ActivityStatus row={row} />
      </View>
      <View style={styles.badges}>
        <Badge label={roleLabel(row.role)} tone="blue" />
        {row.code ? <Badge label={row.code} /> : null}
      </View>
      <View style={styles.metrics}>
        <Metric label="Connexions" value={row.loginCount} />
        <Metric label="Actions produit" value={row.productActionsCount} />
        <Metric label="Exports" value={row.exportDownloadCount} />
      </View>
      <Text style={styles.sub}>
        {row.lastLoginAt
          ? `Dernière connexion ${formatRelative(row.lastLoginAt)} (${formatDateTime(row.lastLoginAt)})`
          : 'Jamais connecté'}
      </Text>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  const styles = useStyles();
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{formatInteger(value)}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ExportsList({ rows, loading, error, search, days, header, refreshing, onRefresh }: ListProps<ExportDownloadEntry>) {
  const styles = useStyles();
  const t = useTheme();

  const filtered = useMemo(() => {
    const q = normalizeForSearch(search.trim());
    if (!rows) return [];
    if (!q) return rows;
    return rows.filter(
      (e) =>
        normalizeForSearch(e.userName ?? '').includes(q) ||
        normalizeForSearch(e.userEmail ?? '').includes(q) ||
        e.brands.some((b) => normalizeForSearch(b).includes(q)),
    );
  }, [rows, search]);

  const uniqueUsers = new Set((rows ?? []).map((e) => e.userId).filter(Boolean)).size;
  const totalRows = (rows ?? []).reduce((acc, e) => acc + e.rowCount, 0);

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ExportCard entry={item} />}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      initialNumToRender={8}
      windowSize={9}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accentText} />}
      ListHeaderComponent={
        <View style={styles.headerWrap}>
          {header}
          <StatRow>
            <StatCard label={`Exports (${days} j)`} value={rows?.length ?? 0} />
            <StatCard label="Utilisateurs distincts" value={uniqueUsers} />
            <StatCard label="Lignes exportées" value={formatInteger(totalRows)} tone="success" />
          </StatRow>
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <ListSkeleton rows={4} height={110} />
        ) : error ? (
          <ErrorBanner error={error} fallback="Impossible de charger les exports" onRetry={onRefresh} />
        ) : (
          <EmptyState icon={<Download size={24} color={t.textMuted} />} title="Aucun export" text="Aucun export sur la période." />
        )
      }
    />
  );
}

function ExportCard({ entry }: { entry: ExportDownloadEntry }) {
  const styles = useStyles();
  return (
    <Card contentStyle={styles.cardContent}>
      <View style={styles.cardTop}>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {entry.userName ?? '—'}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {entry.userEmail ?? ''}
          </Text>
        </View>
        <Text style={styles.rows}>{formatInteger(entry.rowCount)} lignes</Text>
      </View>
      <View style={styles.badges}>
        {entry.userRole ? <Badge label={roleLabel(entry.userRole)} tone="blue" /> : null}
        {entry.warehouse ? <Badge label={entry.warehouse} /> : null}
        {entry.brands.map((b) => (
          <Badge key={`b-${b}`} label={b} tone="purple" />
        ))}
        {entry.countries.map((c) => (
          <Badge key={`c-${c}`} label={COUNTRY_LABELS[c] ?? c} tone="green" />
        ))}
      </View>
      <Text style={styles.sub}>
        {formatDateTime(entry.createdAt)}
        {entry.ip ? ` · ${entry.ip}` : ''}
      </Text>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  content: { flexGrow: 1, paddingBottom: 160, paddingHorizontal: spacing.xl, gap: spacing.md },
  headerWrap: { gap: spacing.md, paddingTop: spacing.sm },
  header: { gap: spacing.md },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  switchLabel: { flex: 1, fontSize: fontSize.sm, color: t.text },
  cardContent: { gap: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  identity: { flex: 1, gap: 2 },
  name: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  sub: { fontSize: fontSize.xs, color: t.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  metrics: { flexDirection: 'row', gap: spacing.lg },
  metric: { gap: 1 },
  metricValue: { fontSize: fontSize.base, fontWeight: '800', color: t.text },
  metricLabel: { fontSize: 10, color: t.textSubtle },
  rows: { fontSize: fontSize.sm, fontWeight: '700', color: t.accentText },
}));
