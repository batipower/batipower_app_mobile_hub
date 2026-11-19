import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { MapPin, Printer } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubPrintSupervision } from '@/auth/permissions';
import { StatGrid, StatTile } from '@/features/cockpit/components/CockpitPrimitives';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { formatInteger } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { PrintServerItem } from '@/types/hubSupervision';

import { CarrierTests } from './components/CarrierTests';
import { PrintServerRow } from './components/PrintServerRow';
import { PrintServersMap } from './components/PrintServersMap';
import { formatDuration } from './display';
import { usePrintServerActions } from './hooks/usePrintServerActions';
import { usePrintOverview, useTodayLabelsByWarehouse } from './hooks/usePrintSupervision';
import { openPrintServerLocation } from './navigation';

/** Supervision impression du HUB (SUPERADMIN) : un serveur d'impression par entrepôt. */
export function PrintSupervisionScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canAccessHubPrintSupervision(user.role) ? (
    <PrintSupervision />
  ) : (
    <AccessDenied
      title="Accès réservé"
      text="La supervision de l'impression est réservée au compte Super Admin."
    />
  );
}

/** Horloge locale (1 s) pour les durées « il y a … » affichées par les postes. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function PrintSupervision() {
  const styles = useStyles();
  const t = useTheme();
  const overview = usePrintOverview(true);
  const todayByWarehouse = useTodayLabelsByWarehouse(true);
  const actions = usePrintServerActions();
  const { refreshing, onRefresh } = usePullToRefresh(overview.refetch);
  const nowMs = useNow(1000);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const listTop = useRef(0);
  const rowTops = useRef(new Map<string, number>());

  const data = overview.data;

  /** Déplie un poste (un seul à la fois) ; l'ouvre en vue quand il vient de la carte. */
  const toggleServer = useCallback((serverId: string) => {
    setExpandedId((current) => (current === serverId ? null : serverId));
  }, []);

  const selectFromMap = useCallback((serverId: string) => {
    setExpandedId(serverId);
    const top = rowTops.current.get(serverId);
    if (top !== undefined) {
      scrollRef.current?.scrollTo({ y: Math.max(0, listTop.current + top - spacing.md), animated: true });
    }
  }, []);

  const carrierVars = actions.carrierTest.isPending ? actions.carrierTest.variables : undefined;
  const pendingFor = (warehouse: string) =>
    carrierVars && carrierVars.warehouse === warehouse
      ? { carrier: carrierVars.carrier, mode: carrierVars.mode }
      : null;
  const onCarrierTest =
    (warehouse: string) => (carrier: 'GLS' | 'DPD', mode: 'API' | 'PRINT') =>
      actions.carrierTest.mutate({ warehouse, carrier, mode });

  const withoutAddress = data?.servers.filter((server) => !server.location) ?? [];

  const renderServer = (server: PrintServerItem) => (
    <View
      key={server.serverId}
      onLayout={(event) => rowTops.current.set(server.serverId, event.nativeEvent.layout.y)}
    >
      <PrintServerRow
        server={server}
        expanded={expandedId === server.serverId}
        onToggleExpand={toggleServer}
        todayLabels={todayByWarehouse ? (todayByWarehouse.get(server.warehouse) ?? 0) : null}
        nowMs={nowMs}
        carrierTests={data?.carrierTests?.[server.warehouse]}
        carrierRuns={actions.runs}
        carrierPending={pendingFor(server.warehouse)}
        carrierBusy={actions.carrierTest.isPending}
        onCarrierTest={onCarrierTest(server.warehouse)}
        onToggleEnabled={(item) => actions.toggleEnabled.mutate(item)}
        toggling={
          actions.toggleEnabled.isPending &&
          actions.toggleEnabled.variables?.serverId === server.serverId
        }
        onTestPrint={(item) => actions.testLabel.mutate(item)}
        testing={
          actions.testLabel.isPending && actions.testLabel.variables?.serverId === server.serverId
        }
        onEditLocation={(item) => openPrintServerLocation(item.serverId)}
      />
    </View>
  );

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={t.accentText}
        />
      }
    >
      <Text style={styles.intro}>
        Un serveur d&apos;impression par entrepôt. Actualisation automatique toutes les 15 secondes.
      </Text>

      {overview.isError ? (
        <ErrorBanner
          error={overview.error}
          fallback="Impossible de charger l'état des serveurs d'impression"
          onRetry={() => void onRefresh()}
        />
      ) : null}

      {overview.isPending ? <ListSkeleton rows={4} height={90} /> : null}

      {data ? (
        <>
          <StatGrid>
            <StatTile label="Serveurs supervisés" value={formatInteger(data.summary.total)} />
            <StatTile label="En ligne" value={formatInteger(data.summary.online)} tone="success" />
            <StatTile
              label="En anomalie"
              value={formatInteger(data.summary.problems)}
              tone={data.summary.problems > 0 ? 'danger' : 'default'}
            />
            <StatTile
              label="Étiquettes en attente"
              value={formatInteger(data.summary.pendingLabels)}
              tone={data.summary.pendingLabels > 0 ? 'warning' : 'default'}
            />
          </StatGrid>

          <PrintServersMap
            servers={data.servers}
            expandedId={expandedId}
            onSelectServer={selectFromMap}
          />

          <View
            style={styles.list}
            onLayout={(event) => {
              listTop.current = event.nativeEvent.layout.y;
            }}
          >
            {data.servers.length === 0 ? (
              <EmptyState
                icon={<Printer size={24} color={t.textMuted} />}
                title="Aucun serveur d'impression"
                text="Un poste apparaît ici dès que back-printer se connecte avec API_WS_URL et PRINT_SERVER_TOKEN."
              />
            ) : (
              data.servers.map(renderServer)
            )}
          </View>

          {data.unmonitoredWarehouses.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Entrepôts sans serveur d&apos;impression actif
              </Text>
              {data.unmonitoredWarehouses.map((warehouse) => (
                <View
                  key={warehouse.warehouse}
                  style={[
                    styles.warehouse,
                    warehouse.problem && {
                      borderColor: withAlpha(t.danger, 0.4),
                      backgroundColor: withAlpha(t.danger, 0.08),
                    },
                  ]}
                >
                  <Text style={[styles.warehouseName, warehouse.problem && { color: t.danger }]}>
                    {warehouse.warehouse}
                  </Text>
                  <Text style={[styles.warehouseText, warehouse.problem && { color: t.danger }]}>
                    {warehouse.pendingCount} étiquette{warehouse.pendingCount > 1 ? 's' : ''} en attente
                    {warehouse.oldestPendingAgeSec !== null
                      ? ` (la plus ancienne : ${formatDuration(warehouse.oldestPendingAgeSec)})`
                      : ''}
                  </Text>
                  <CarrierTests
                    warehouse={warehouse.warehouse}
                    options={data.carrierTests?.[warehouse.warehouse] ?? []}
                    canPrint={false}
                    printDisabledReason="Aucun poste d'impression actif pour cet entrepôt"
                    runs={actions.runs}
                    pending={pendingFor(warehouse.warehouse)}
                    busy={actions.carrierTest.isPending}
                    onTest={onCarrierTest(warehouse.warehouse)}
                  />
                </View>
              ))}
            </View>
          ) : null}

          {withoutAddress.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Postes sans adresse
              </Text>
              <View style={styles.chips}>
                {withoutAddress.map((server) => (
                  <Pressable
                    key={server.serverId}
                    onPress={() => openPrintServerLocation(server.serverId)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ajouter une adresse au poste ${server.warehouse}`}
                    style={({ pressed }) => [styles.chip, pressed && { backgroundColor: t.surfaceStrong }]}
                  >
                    <MapPin size={13} color={t.textFaint} />
                    <Text style={styles.chipName}>{server.warehouse}</Text>
                    <Text style={styles.chipAction}>Ajouter une adresse</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  scroll: { flex: 1, backgroundColor: t.bg },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing['4xl'] },
  intro: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  list: { gap: spacing.sm },
  section: { gap: spacing.sm },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: t.textSubtle,
  },
  warehouse: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  warehouseName: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  warehouseText: { fontSize: fontSize.xs, color: t.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  chipName: { fontSize: fontSize.xs, fontWeight: '700', color: t.text },
  chipAction: { fontSize: fontSize.xs, color: t.accentText },
}));
