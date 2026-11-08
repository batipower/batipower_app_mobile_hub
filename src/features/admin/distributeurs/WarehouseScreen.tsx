import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Building2, KeyRound, Plus } from 'lucide-react-native';

import { FilterPill } from '@/components/sheet/FilterPill';
import { Badge, Button } from '@/components/ui';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { chooseAction } from '@/lib/actionSheet';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type {
  AdminDistributor,
  AdminDistributorWarehouse,
  AdminSubsidiary,
  EbatproAccount,
} from '@/types/adminPartners';

import { warehouseSupportsEbatpro } from '../shared/accessRules';
import { Notice } from '../shared/components/FormParts';
import { DistributorLogo } from './components';
import { AgenciesPane } from './config/AgenciesPane';
import { FlowPane } from './config/FlowPane';
import { PalletPane } from './config/PalletPane';
import { useWarehouseConfig } from './config/useWarehouseConfig';
import { openLogoSheet, useDeleteEntity } from './distributorMutations';
import { EbatproAccountRow } from './ebatpro/EbatproAccountRow';
import { useEbatproActions } from './ebatpro/useEbatproActions';
import { useDistributor, useEbatproAccounts } from './hooks';
import { WarehouseGeneralPane } from './WarehouseGeneralPane';
import { warehouseMissingAccount } from './utils';

type PaneKey = 'general' | 'subsidiaries' | 'accounts' | 'flow' | 'pallet' | 'agencies';

const PANES: { key: PaneKey; label: string }[] = [
  { key: 'general', label: 'Général' },
  { key: 'subsidiaries', label: 'Filiales' },
  { key: 'accounts', label: 'Comptes eBatPro' },
  { key: 'flow', label: 'Flux' },
  { key: 'pallet', label: 'Palette' },
  { key: 'agencies', label: 'Agences' },
];

/** Fiche d'un entrepôt : réglages, filiales, comptes eBatPro et configuration des flux. */
export function WarehouseScreen() {
  const { distributorId, warehouseId } = useLocalSearchParams<{ distributorId: string; warehouseId: string }>();
  const t = useTheme();
  const styles = useStyles();
  const { distributor, warehouse, isLoading, error, refetch } = useDistributor(distributorId, warehouseId);
  const ebatpro = useEbatproAccounts();
  const [pane, setPane] = useState<PaneKey>('general');
  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await Promise.all([refetch(), ebatpro.refetch()]);
  });

  if (!distributor || !warehouse) {
    return (
      <View style={{ padding: spacing.xl }}>
        <Stack.Screen options={{ title: 'Entrepôt' }} />
        {isLoading ? (
          <ListSkeleton rows={3} height={110} />
        ) : error ? (
          <ErrorBanner error={error} fallback="Impossible de charger l'entrepôt" onRetry={() => void refetch()} />
        ) : (
          <EmptyState icon={<Building2 size={24} color={t.textMuted} />} title="Entrepôt introuvable" />
        )}
      </View>
    );
  }

  const accounts = (ebatpro.data?.accounts ?? []).filter((a) => a.distributorWarehouseId === warehouse.id);
  const missing = warehouseMissingAccount(warehouse, accounts);
  const ebatproCapable = warehouseSupportsEbatpro(warehouse.warehouse);
  const panes = PANES.filter((p) => ebatproCapable || !['accounts', 'flow', 'pallet', 'agencies'].includes(p.key));

  return (
    <>
      <Stack.Screen options={{ title: warehouse.name }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={t.accentText} />}
      >
        <View style={styles.badges}>
          <Text style={styles.sub}>{distributor.name}</Text>
          {warehouse.isActive === false ? <Badge label="Désactivé" tone="amber" /> : null}
          {warehouse.acceptsOrders === false ? <Badge label="Commandes coupées" tone="red" /> : null}
          {missing ? <Badge label="Compte eBatPro manquant" tone="amber" /> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
          {panes.map((p) => (
            <FilterPill key={p.key} label={p.label} state={pane === p.key ? 'on' : 'off'} onPress={() => setPane(p.key)} />
          ))}
        </ScrollView>

        {pane === 'general' ? <WarehouseGeneralPane distributor={distributor} warehouse={warehouse} /> : null}
        {pane === 'subsidiaries' ? <SubsidiariesPane warehouse={warehouse} /> : null}
        {pane === 'accounts' ? (
          <AccountsPane
            warehouse={warehouse}
            accounts={accounts}
            encryptionAvailable={ebatpro.data?.encryptionAvailable ?? true}
            loading={ebatpro.isLoading}
            error={ebatpro.error}
            envFallback={ebatpro.data?.envFallbackWarehouses.includes(warehouse.warehouse ?? '') ?? false}
            onRetry={() => void ebatpro.refetch()}
          />
        ) : null}
        {pane === 'flow' || pane === 'pallet' || pane === 'agencies' ? (
          <ConfigPane pane={pane} distributor={distributor} warehouse={warehouse} />
        ) : null}
      </ScrollView>
    </>
  );
}

function ConfigPane({
  pane,
  distributor,
  warehouse,
}: {
  pane: 'flow' | 'pallet' | 'agencies';
  distributor: AdminDistributor;
  warehouse: AdminDistributorWarehouse;
}) {
  const t = useTheme();
  const query = useWarehouseConfig(distributor.id, warehouse.id);
  if (query.isLoading) return <ListSkeleton rows={2} height={140} />;
  if (query.error || !query.data) {
    return <ErrorBanner error={query.error} fallback="Impossible de charger la configuration" onRetry={() => void query.refetch()} />;
  }
  const config = query.data;
  // La clé force la réinitialisation des brouillons quand la configuration enregistrée change.
  const key = `${pane}-${config.updatedAt ?? 'default'}`;
  const common = { distributorId: distributor.id, warehouseId: warehouse.id, config };
  return (
    <View style={{ gap: spacing.md }}>
      {config.updatedAt ? (
        <Text style={{ fontSize: fontSize.xs, color: t.textMuted }}>
          Dernière modification {config.updatedBy ? `par ${config.updatedBy}` : ''}
        </Text>
      ) : null}
      {pane === 'flow' ? <FlowPane key={key} {...common} /> : null}
      {pane === 'pallet' ? <PalletPane key={key} {...common} /> : null}
      {pane === 'agencies' ? <AgenciesPane key={key} {...common} /> : null}
    </View>
  );
}

function SubsidiariesPane({ warehouse }: { warehouse: AdminDistributorWarehouse }) {
  const styles = useStyles();
  const t = useTheme();
  const remove = useDeleteEntity();

  const openMenu = async (s: AdminSubsidiary) => {
    const action = await chooseAction<'edit' | 'logo' | 'delete'>(s.name, [
      { label: 'Modifier', value: 'edit' },
      { label: 'Logo', value: 'logo' },
      { label: 'Supprimer', value: 'delete', destructive: true },
    ]);
    if (action === 'edit') router.push({ pathname: '/admin/partenaires/filiale-formulaire', params: { id: s.id } });
    else if (action === 'logo') openLogoSheet('subsidiary', s.id);
    else if (action === 'delete') remove.confirm({ kind: 'subsidiary', item: s });
  };

  return (
    <View style={styles.pane}>
      <Button
        label="Ajouter une filiale"
        variant="outline"
        leadingIcon={<Plus size={16} color={t.accentText} />}
        onPress={() => router.push({ pathname: '/admin/partenaires/filiale-formulaire', params: { warehouseId: warehouse.id } })}
      />
      {warehouse.subsidiaries.length === 0 ? (
        <Text style={styles.sub}>Aucune filiale : les utilisateurs de cet entrepôt s’inscrivent via ses filiales.</Text>
      ) : (
        warehouse.subsidiaries.map((s) => (
          <Pressable
            key={s.id}
            accessibilityRole="button"
            accessibilityLabel={s.name}
            onPress={() => void openMenu(s)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            <DistributorLogo logo={s} label={s.name} />
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{s.name}</Text>
              <Text style={styles.sub}>
                {s.activeUserCount} actif{s.activeUserCount > 1 ? 's' : ''} / {s.userCount} utilisateur{s.userCount > 1 ? 's' : ''}
              </Text>
            </View>
            {!s.isActive ? <Badge label="Inactive" tone="neutral" /> : null}
          </Pressable>
        ))
      )}
    </View>
  );
}

function AccountsPane({
  warehouse,
  accounts,
  encryptionAvailable,
  loading,
  error,
  envFallback,
  onRetry,
}: {
  warehouse: AdminDistributorWarehouse;
  accounts: EbatproAccount[];
  encryptionAvailable: boolean;
  loading: boolean;
  error: unknown;
  envFallback: boolean;
  onRetry: () => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  const actions = useEbatproActions(encryptionAvailable);

  if (loading) return <ListSkeleton rows={2} height={90} />;
  if (error) return <ErrorBanner error={error} fallback="Impossible de charger les comptes" onRetry={onRetry} />;

  return (
    <View style={styles.pane}>
      {!encryptionAvailable ? (
        <Notice tone="warning">
          Clé de chiffrement eBatPro absente côté serveur : création, modification et test des comptes sont désactivés.
        </Notice>
      ) : null}
      {envFallback && accounts.length === 0 ? (
        <Notice>Cet entrepôt est encore servi par les variables d’environnement du serveur.</Notice>
      ) : null}
      <Button
        label="Ajouter un compte"
        variant="outline"
        disabled={!encryptionAvailable}
        leadingIcon={<KeyRound size={16} color={t.accentText} />}
        onPress={() => router.push({ pathname: '/admin/partenaires/ebatpro-formulaire', params: { warehouseId: warehouse.id } })}
      />
      {accounts.length === 0 ? (
        <Text style={styles.sub}>Aucun compte eBatPro : l’entrepôt ne peut pas proposer de prix sur les opportunités DEP.</Text>
      ) : (
        accounts.map((a) => (
          <EbatproAccountRow key={a.id} account={a} busy={actions.busyId === a.id} onPress={() => void actions.openMenu(a)} />
        ))
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: spacing.xl, paddingBottom: 160, gap: spacing.lg },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  sub: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  pills: { gap: spacing.sm, paddingRight: spacing.xl },
  pane: { gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
}));
