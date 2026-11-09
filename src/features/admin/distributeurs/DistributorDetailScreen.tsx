import { Pressable, RefreshControl, ScrollView, Switch, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Building2, ChevronRight, Loader2, MoreHorizontal, Percent } from 'lucide-react-native';

import { Badge, DetailSection, InfoRow } from '@/components/ui';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { chooseAction } from '@/lib/actionSheet';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { AdminDistributor } from '@/types/adminPartners';

import { warehouseLabel } from '../shared/accessRules';
import { Notice } from '../shared/components/FormParts';
import { DistributorLogo } from './components';
import {
  openLogoSheet,
  useDeleteEntity,
  useNegoAutoDeployToggle,
  useOrdersAffectationToggle,
} from './distributorMutations';
import { useDistributor, useEbatproAccounts } from './hooks';
import {
  MARGIN_COPY,
  currentMargin,
  jobPercent,
  useNegoMarginJob,
  useNegoMarginJobWatcher,
  type MarginKind,
} from './margin';
import { SETUP_MISSING_LABELS, formatPct, formatTrace, warehouseMissingAccount } from './utils';

type MenuAction = 'edit' | 'logo' | 'warehouse' | 'delete';

/** Fiche d'un distributeur : réglages, interrupteurs d'affectation, marges et liste des entrepôts. */
export function DistributorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const { distributor, isLoading, error, refetch } = useDistributor(id);
  const ebatpro = useEbatproAccounts();
  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await Promise.all([refetch(), ebatpro.refetch()]);
  });
  const remove = useDeleteEntity({ onDeleted: () => router.back() });
  useNegoMarginJobWatcher(distributor);

  const openMenu = async () => {
    if (!distributor) return;
    const action = await chooseAction<MenuAction>(distributor.name, [
      { label: 'Modifier les réglages', value: 'edit' },
      { label: 'Logo', value: 'logo' },
      { label: 'Ajouter un entrepôt', value: 'warehouse' },
      { label: 'Supprimer', value: 'delete', destructive: true },
    ]);
    if (action === 'edit') router.push({ pathname: '/admin/partenaires/distributeur-formulaire', params: { id: distributor.id } });
    else if (action === 'logo') openLogoSheet('distributor', distributor.id);
    else if (action === 'warehouse') router.push({ pathname: '/admin/partenaires/entrepot-formulaire', params: { distributorId: distributor.id } });
    else if (action === 'delete') remove.confirm({ kind: 'distributor', item: distributor });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: distributor?.name ?? 'Distributeur',
          headerRight: () =>
            distributor ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Actions de ${distributor.name}`} hitSlop={8} onPress={() => void openMenu()}>
                <MoreHorizontal size={22} color={t.accentText} />
              </Pressable>
            ) : null,
        }}
      />
      {distributor ? (
        <DistributorDetail
          distributor={distributor}
          accounts={ebatpro.data?.accounts ?? []}
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
        />
      ) : isLoading ? (
        <View style={{ padding: spacing.xl }}>
          <ListSkeleton rows={3} height={120} />
        </View>
      ) : error ? (
        <View style={{ padding: spacing.xl }}>
          <ErrorBanner error={error} fallback="Impossible de charger le distributeur" onRetry={() => void refetch()} />
        </View>
      ) : (
        <View style={{ padding: spacing.xl }}>
          <EmptyState icon={<Building2 size={24} color={t.textMuted} />} title="Distributeur introuvable" />
        </View>
      )}
    </>
  );
}

function DistributorDetail({
  distributor: d,
  accounts,
  refreshing,
  onRefresh,
}: {
  distributor: AdminDistributor;
  accounts: { distributorWarehouseId: string | null; isActive: boolean }[];
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  const orders = useOrdersAffectationToggle(d);
  const nego = useNegoAutoDeployToggle(d);
  const job = useNegoMarginJob(d).data;
  const subsidiaries = d.warehouses.reduce((sum, w) => sum + w.subsidiaries.length, 0);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accentText} />}
    >
      <View style={styles.hero}>
        <DistributorLogo logo={d} label={d.name} size={52} />
        <View style={styles.heroText}>
          <Text style={styles.name}>{d.name}</Text>
          <Text style={styles.sub}>
            {d.warehouses.length} entrepôt{d.warehouses.length > 1 ? 's' : ''} · {subsidiaries} filiale
            {subsidiaries > 1 ? 's' : ''} · {d.userCount} utilisateur{d.userCount > 1 ? 's' : ''}
          </Text>
          <View style={styles.badges}>
            <Badge label={d.isActive ? 'Actif' : 'Inactif'} tone={d.isActive ? 'green' : 'neutral'} />
            {d.opportunityAccess === 'DEP_ONLY' ? <Badge label="DEP uniquement" tone="purple" /> : null}
            {d.depByWarehouse ? <Badge label="DEP par entrepôt" tone="blue" /> : null}
          </View>
        </View>
      </View>

      {d.ebatproSetup && !d.ebatproSetup.ready ? (
        <Notice tone="warning">
          Configuration incomplète ({d.ebatproSetup.missing.map((m) => SETUP_MISSING_LABELS[m]).join(', ')}) : sans entrepôt et
          compte eBatPro actif, le prix ne peut pas être proposé sur ses opportunités DEP.
        </Notice>
      ) : d.ebatproSetup?.warnings.includes('STORE_CODE') ? (
        <Notice>Code magasin (erpStoreId) absent : pas de synchro de stock / PA du distributeur. Non bloquant.</Notice>
      ) : null}

      <DetailSection title="Interrupteurs">
        {d.ordersAffectationEnabled !== undefined ? (
          <SwitchRow
            label="Affectation des commandes"
            description={orders.trace ?? "Coupée, aucun de ses entrepôts ne reçoit de nouvelle commande."}
            value={d.ordersAffectationEnabled}
            disabled={orders.isPending}
            onValueChange={orders.request}
          />
        ) : null}
        {d.negoAutoDeployPaused !== undefined ? (
          <SwitchRow
            label="Déploiement automatique"
            description={nego.trace ?? 'Acceptation et lancement automatiques des propositions. En pause : tout reste manuel.'}
            value={!d.negoAutoDeployPaused}
            disabled={nego.isPending}
            onValueChange={(auto) => nego.request(!auto)}
          />
        ) : null}
      </DetailSection>

      {d.negoMarginPct !== undefined || d.depDiscountPct !== undefined ? (
        <DetailSection title="Marges d'affichage">
          {(d.opportunityAccess === 'DEP_ONLY' ? (['nego', 'dep', 'depOnly'] as const) : (['nego', 'dep'] as const)).map((kind) => (
            <MarginRow key={kind} kind={kind} distributor={d} />
          ))}
          {job && job.status === 'RUNNING' ? (
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/admin/partenaires/marge', params: { id: d.id, kind: 'nego' } })} style={styles.job}>
              <Loader2 size={14} color={t.accentText} />
              <Text style={styles.jobText}>
                MAJ prix opportunités · {job.examined.toLocaleString('fr-FR')} / {job.total.toLocaleString('fr-FR')}
                {jobPercent(job) !== null ? ` · ${jobPercent(job)} %` : ''}
              </Text>
            </Pressable>
          ) : job && job.status === 'FAILED' ? (
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/admin/partenaires/marge', params: { id: d.id, kind: 'nego' } })} style={styles.job}>
              <Text style={[styles.jobText, { color: t.warning }]}>
                Recalcul interrompu · {job.examined.toLocaleString('fr-FR')} / {job.total.toLocaleString('fr-FR')} · relancer
              </Text>
            </Pressable>
          ) : null}
        </DetailSection>
      ) : null}

      <DetailSection title="Réglages">
        <InfoRow label="Accès aux opportunités" value={d.opportunityAccess === 'DEP_ONLY' ? 'DEP uniquement' : 'Ouvertes + DEP'} />
        <InfoRow label="DEP par entrepôt" value={d.depByWarehouse ? 'Activée' : 'Désactivée'} />
        {d.rebateRate !== undefined ? (
          <InfoRow label="BFA / gain négocié" value={formatPct(Math.round(d.rebateRate * 10000) / 100)} />
        ) : null}
        {d.negoMarginUpdatedAt ? (
          <InfoRow label="Dernière marge" value={formatTrace(d.negoMarginUpdatedAt, d.negoMarginUpdatedBy) ?? '—'} />
        ) : null}
      </DetailSection>

      <View style={styles.block}>
        <Text style={styles.sectionTitle}>Entrepôts ({d.warehouses.length})</Text>
        {d.warehouses.length === 0 ? (
          <Text style={styles.sub}>
            Aucun entrepôt rattaché : créez-en un pour y ajouter des filiales et des comptes eBatPro.
          </Text>
        ) : (
          d.warehouses.map((w) => {
            const missing = warehouseMissingAccount(w, accounts.filter((a) => a.distributorWarehouseId === w.id));
            return (
              <Pressable
                key={w.id}
                accessibilityRole="button"
                accessibilityLabel={w.name}
                onPress={() =>
                  router.push({ pathname: '/admin/partenaires/entrepot', params: { distributorId: d.id, warehouseId: w.id } })
                }
                style={({ pressed }) => [styles.warehouse, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.heroText}>
                  <Text style={styles.warehouseName}>{w.name}</Text>
                  <Text style={styles.sub}>
                    {w.warehouse ? `${warehouseLabel(w.warehouse)} · ` : ''}En cours {w.pendingOrders ?? 0} · {w.subsidiaries.length} filiale
                    {w.subsidiaries.length > 1 ? 's' : ''}
                  </Text>
                  <View style={styles.badges}>
                    {w.isActive === false ? <Badge label="Désactivé" tone="amber" /> : null}
                    {w.acceptsOrders === false ? <Badge label="Commandes coupées" tone="red" /> : null}
                    {missing ? <Badge label="Compte eBatPro manquant" tone="amber" /> : null}
                  </View>
                </View>
                <ChevronRight size={18} color={t.textSubtle} />
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

function SwitchRow({
  label,
  description,
  value,
  disabled,
  onValueChange,
}: {
  label: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.switchRow}>
      <View style={styles.heroText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.sub}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: t.accent, false: t.surfaceStrong }}
        accessibilityLabel={label}
      />
    </View>
  );
}

function MarginRow({ kind, distributor }: { kind: MarginKind; distributor: AdminDistributor }) {
  const styles = useStyles();
  const t = useTheme();
  const raw =
    kind === 'nego'
      ? distributor.negoMarginPct
      : kind === 'dep'
        ? distributor.depDiscountPct
        : distributor.depOnlyAskedDiscountPct;
  if (raw === undefined) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${MARGIN_COPY[kind].pill} : ${formatPct(currentMargin(kind, distributor))}`}
      onPress={() => router.push({ pathname: '/admin/partenaires/marge', params: { id: distributor.id, kind } })}
      style={styles.switchRow}
    >
      <Percent size={16} color={t.textMuted} />
      <View style={styles.heroText}>
        <Text style={styles.rowLabel}>{MARGIN_COPY[kind].pill}</Text>
        <Text style={styles.sub}>
          {kind === 'nego'
            ? formatTrace(distributor.negoMarginUpdatedAt, distributor.negoMarginUpdatedBy) ?? 'Marge cible cachée hors DEP'
            : kind === 'dep'
              ? formatTrace(distributor.depDiscountUpdatedAt, distributor.depDiscountUpdatedBy) ?? 'Remise appliquée au prix demandé des DEP'
              : formatTrace(distributor.depOnlyAskedDiscountUpdatedAt, distributor.depOnlyAskedDiscountUpdatedBy) ??
                "Remise supplémentaire du prix d'achat demandé (DEP only)"}
        </Text>
      </View>
      <Text style={styles.value}>{formatPct(currentMargin(kind, distributor))}</Text>
      <ChevronRight size={16} color={t.textSubtle} />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: spacing.xl, paddingBottom: 160, gap: spacing.xl },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroText: { flex: 1, gap: 2 },
  name: { fontSize: fontSize.xl, fontWeight: '800', color: t.text },
  sub: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  rowLabel: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  value: { fontSize: fontSize.base, fontWeight: '800', color: t.text },
  job: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm },
  jobText: { fontSize: fontSize.xs, fontWeight: '600', color: t.accentText },
  block: { gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', color: t.textSubtle },
  warehouse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  warehouseName: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
}));
