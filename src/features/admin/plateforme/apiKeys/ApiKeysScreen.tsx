import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Switch, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react-native';

import { FilterPill } from '@/components/sheet/FilterPill';
import { Badge, Button, Card } from '@/components/ui';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { SegmentedControl } from '@/features/preparation/components/SegmentedControl';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { normalizeForSearch } from '@/features/preparation/orderHelpers';
import { formatDate, formatDateTime, formatInteger } from '@/lib/format';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import {
  API_KEY_WAREHOUSES,
  formatApiKeyWarehouse,
  previewApiKey,
  type AggregatedStatsByApiKey,
  type ApiKeyConfig,
  type ApiKeyRequest,
} from '@/types/adminPlatform';

import { useApiKeyConfigs, useApiKeyRequests, useApiKeyStats } from '../hooks';
import { useApiKeyListActions } from './useApiKeyActions';

type Tab = 'configs' | 'requests' | 'recommendations' | 'stats';

type Row =
  | { kind: 'config'; id: string; item: ApiKeyConfig }
  | { kind: 'request'; id: string; item: ApiKeyRequest }
  | { kind: 'certify'; id: string; item: AggregatedStatsByApiKey }
  | { kind: 'stat'; id: string; item: AggregatedStatsByApiKey };

/** Clés API : configurations, demandes de l'extension, clés à certifier et statistiques d'usage. */
export function ApiKeysScreen() {
  const styles = useStyles();
  const t = useTheme();
  const [tab, setTab] = useState<Tab>('configs');
  const [search, setSearch] = useState('');
  const [warehouse, setWarehouse] = useState<string>('all');
  const configs = useApiKeyConfigs();
  const stats = useApiKeyStats();
  const requests = useApiKeyRequests();
  const { toggle, remove } = useApiKeyListActions();

  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await Promise.all([configs.refetch(), stats.refetch(), requests.refetch()]);
  });

  const configList = configs.data;
  const statList = stats.data;
  const pending = requests.data?.data;
  const uncertified = useMemo(() => {
    const configured = new Set((configList ?? []).map((c) => c.apiKey));
    return (statList ?? []).filter((s) => !configured.has(s.apiKey));
  }, [configList, statList]);

  const rows = useMemo<Row[]>(() => {
    const q = normalizeForSearch(search.trim());
    if (tab === 'configs') {
      return (configList ?? [])
        .filter((c) => {
          const matches = !q || normalizeForSearch(c.name).includes(q) || normalizeForSearch(c.apiKey).includes(q);
          return matches && (warehouse === 'all' || c.warehouse === warehouse);
        })
        .map((item) => ({ kind: 'config' as const, id: item.uuid, item }));
    }
    if (tab === 'requests') {
      return (pending ?? [])
        .filter((r) => !q || normalizeForSearch(r.requesterName).includes(q) || normalizeForSearch(r.requesterEmail ?? '').includes(q))
        .map((item) => ({ kind: 'request' as const, id: item.uuid, item }));
    }
    if (tab === 'recommendations') {
      return [...uncertified]
        .sort((a, b) => b.totalCalls - a.totalCalls)
        .map((item) => ({ kind: 'certify' as const, id: item.apiKey, item }));
    }
    return [...(statList ?? [])]
      .filter((s) => !q || normalizeForSearch(s.name).includes(q) || normalizeForSearch(s.apiKeyPreview).includes(q))
      .sort((a, b) => b.totalCalls - a.totalCalls)
      .map((item) => ({ kind: 'stat' as const, id: item.apiKey, item }));
  }, [tab, search, warehouse, configList, pending, uncertified, statList]);

  const current = tab === 'configs' ? configs : tab === 'requests' ? requests : stats;
  const confirmDelete = (config: ApiKeyConfig) =>
    Alert.alert(
      'Supprimer cette clé ?',
      `${config.name} (${previewApiKey(config.apiKey)}). Les scrapers ou postes qui l'utilisent ne pourront plus appeler l'API.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => remove.mutate(config.apiKey) },
      ],
    );

  const renderItem = ({ item }: { item: Row }) => {
    switch (item.kind) {
      case 'config':
        return (
          <ConfigCard
            config={item.item}
            busy={toggle.isPending || remove.isPending}
            onToggle={(active) => toggle.mutate({ apiKey: item.item.apiKey, active })}
            onEdit={() => router.push({ pathname: '/admin/plateforme/cles-api-formulaire', params: { mode: 'edit', apiKey: item.item.apiKey } })}
            onDelete={() => confirmDelete(item.item)}
          />
        );
      case 'request':
        return (
          <RequestCard
            request={item.item}
            onApprove={() => router.push({ pathname: '/admin/plateforme/cles-api-approuver', params: { uuid: item.item.uuid } })}
            onReject={() => router.push({ pathname: '/admin/plateforme/cles-api-refuser', params: { uuid: item.item.uuid } })}
          />
        );
      case 'certify':
        return (
          <StatCard
            stat={item.item}
            action={
              <Button
                variant="outline"
                label="Certifier"
                leadingIcon={<ShieldCheck size={16} color={t.accentText} />}
                onPress={() => router.push({ pathname: '/admin/plateforme/cles-api-formulaire', params: { mode: 'certify', apiKey: item.item.apiKey } })}
              />
            }
          />
        );
      default:
        return <StatCard stat={item.item} />;
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nouvelle clé"
              hitSlop={8}
              onPress={() => router.push({ pathname: '/admin/plateforme/cles-api-formulaire', params: { mode: 'create' } })}
            >
              <Plus size={22} color={t.accentText} />
            </Pressable>
          ),
        }}
      />
      <Stack.SearchBar
        placeholder="Nom, clé…"
        autoCapitalize="none"
        tintColor={t.accentText}
        hideWhenScrolling={false}
        obscureBackground={false}
        onChangeText={(event) => setSearch(event.nativeEvent.text)}
        onCancelButtonPress={() => setSearch('')}
      />
      <FlatList
        data={rows}
        keyExtractor={(row) => `${row.kind}-${row.id}`}
        renderItem={renderItem}
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
            <SegmentedControl<Tab>
              segments={[
                { key: 'configs', label: 'Clés', count: configList?.length },
                { key: 'requests', label: 'Demandes', count: pending?.length || undefined },
                { key: 'recommendations', label: 'À certifier', count: uncertified.length || undefined },
                { key: 'stats', label: 'Stats' },
              ]}
              value={tab}
              onChange={setTab}
            />
            {tab === 'configs' ? (
              <View style={styles.pills}>
                <FilterPill label="Tous" state={warehouse === 'all' ? 'on' : 'off'} onPress={() => setWarehouse('all')} />
                {API_KEY_WAREHOUSES.map((w) => (
                  <FilterPill key={w} label={formatApiKeyWarehouse(w)} state={warehouse === w ? 'on' : 'off'} onPress={() => setWarehouse(w)} />
                ))}
              </View>
            ) : null}
            {tab === 'recommendations' && uncertified.length > 0 ? (
              <Text style={styles.notice}>
                {uncertified.length} clé{uncertified.length > 1 ? 's' : ''} utilisée{uncertified.length > 1 ? 's' : ''} sans
                configuration. Certifiez-les pour leur attribuer un nom et un entrepôt.
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          current.isLoading ? (
            <ListSkeleton rows={3} height={110} />
          ) : current.error ? (
            <ErrorBanner error={current.error} fallback="Impossible de charger les clés API" onRetry={() => void onRefresh()} />
          ) : (
            <EmptyState
              icon={<KeyRound size={24} color={t.textMuted} />}
              title={
                tab === 'requests'
                  ? 'Aucune demande en attente'
                  : tab === 'recommendations'
                    ? 'Toutes les clés sont certifiées'
                    : 'Aucune clé'
              }
              text={
                tab === 'recommendations'
                  ? "Aucune clé utilisée dans les statistiques n'est absente des configurations."
                  : undefined
              }
            />
          )
        }
      />
    </>
  );
}

function ConfigCard({
  config,
  busy,
  onToggle,
  onEdit,
  onDelete,
}: {
  config: ApiKeyConfig;
  busy: boolean;
  onToggle: (active: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <Card contentStyle={styles.cardContent}>
      <View style={styles.top}>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {config.name}
          </Text>
          <Text style={styles.mono}>{previewApiKey(config.apiKey)}</Text>
        </View>
        <Switch
          value={config.isActive}
          onValueChange={onToggle}
          disabled={busy}
          trackColor={{ true: t.accent, false: t.surfaceStrong }}
          accessibilityLabel={`${config.name} active`}
        />
      </View>
      <View style={styles.badges}>
        <Badge label={formatApiKeyWarehouse(config.warehouse)} tone="blue" />
        <Badge label={config.isActive ? 'Active' : 'Inactive'} tone={config.isActive ? 'green' : 'neutral'} />
        {config.appUserId ? <Badge label="Extension HUB" tone="purple" /> : null}
      </View>
      {config.description ? <Text style={styles.sub}>{config.description}</Text> : null}
      <Text style={styles.sub}>Créée le {formatDate(config.createdAt)}</Text>
      <View style={styles.actionsRow}>
        <Button variant="outline" label="Modifier" leadingIcon={<Pencil size={16} color={t.accentText} />} onPress={onEdit} style={styles.flex} />
        <Button variant="ghost" destructive label="Supprimer" leadingIcon={<Trash2 size={16} color={t.danger} />} onPress={onDelete} disabled={busy} style={styles.flex} />
      </View>
    </Card>
  );
}

function RequestCard({ request, onApprove, onReject }: { request: ApiKeyRequest; onApprove: () => void; onReject: () => void }) {
  const styles = useStyles();
  return (
    <Card contentStyle={styles.cardContent}>
      <Text style={styles.name}>{request.requesterName}</Text>
      <Text style={styles.sub}>
        {request.requesterEmail || 'E-mail non renseigné'} · {formatApiKeyWarehouse(request.warehouse)}
      </Text>
      {request.reason ? <Text style={styles.sub}>Motif : {request.reason}</Text> : null}
      <Text style={styles.sub}>
        Reçue le {formatDateTime(request.createdAt)}
        {request.deviceLabel ? ` · ${request.deviceLabel}` : ''}
        {request.extensionVersion ? ` · v${request.extensionVersion}` : ''}
      </Text>
      <View style={styles.actionsRow}>
        <Button label="Valider" onPress={onApprove} style={styles.flex} />
        <Button variant="outline" label="Refuser" onPress={onReject} style={styles.flex} />
      </View>
    </Card>
  );
}

function StatCard({ stat, action }: { stat: AggregatedStatsByApiKey; action?: React.ReactNode }) {
  const styles = useStyles();
  return (
    <Card contentStyle={styles.cardContent}>
      <View style={styles.top}>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {stat.name}
          </Text>
          <Text style={styles.mono}>{stat.apiKeyPreview}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{formatInteger(stat.totalCalls)}</Text>
          <Text style={styles.sub}>appels</Text>
        </View>
      </View>
      <View style={styles.badges}>
        <Badge label={formatApiKeyWarehouse(stat.warehouse)} tone="blue" />
        <Badge label={`${stat.uniqueRoutes} route${stat.uniqueRoutes > 1 ? 's' : ''}`} />
        {!stat.isActive ? <Badge label="Inactive" /> : null}
      </View>
      {action}
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  content: { flexGrow: 1, paddingBottom: 160, paddingHorizontal: spacing.xl, gap: spacing.md },
  header: { gap: spacing.md, paddingTop: spacing.sm },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  notice: { fontSize: fontSize.xs, lineHeight: 17, color: t.warning },
  cardContent: { gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identity: { flex: 1, gap: 2 },
  name: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  mono: { fontSize: fontSize.xs, color: t.textMuted, fontVariant: ['tabular-nums'] },
  sub: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  flex: { flex: 1 },
  metric: { alignItems: 'flex-end' },
  metricValue: { fontSize: fontSize.lg, fontWeight: '800', color: t.text },
}));
