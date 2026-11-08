import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ShieldCheck, X } from 'lucide-react-native';

import type { HubCancellationControlItem } from '@/api/hubCancellationControl';
import { useAuth } from '@/auth/AuthProvider';
import {
  canAccessHubCancellationControl,
  canRecheckOrIgnoreCancellation,
  canReviewCreditNote,
} from '@/auth/permissions';
import { FilterPill } from '@/components/sheet/FilterPill';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { Segment, SegmentedControl } from '@/features/preparation/components/SegmentedControl';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { WAREHOUSE_OPTIONS } from '@/features/pricing/options';
import { formatEuro } from '@/lib/format';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { AppUserRole } from '@/types/user';

import { CancellationControlCard } from './components/CancellationControlCard';
import {
  matchesSearch,
  rowActions,
  type CancellationControlTab,
  type RolePermissions,
} from './display';
import { useCancellationControlList } from './hooks/useCancellationControlList';
import { useCancellationControlMutations } from './hooks/useCancellationControlMutations';
import { openCancellationIgnore, openCancellationOrder } from './navigation';

/** Entrepôts ayant la capacité DEP, contrôlés dans eBatPro (comme le filtre du web). */
const WAREHOUSE_FILTERS = WAREHOUSE_OPTIONS.filter(
  (option) => option.value === 'FLEVY' || option.value === 'DOMBASLE',
);

const keyExtractor = (item: HubCancellationControlItem) => item.id;

function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

/** Contrôle des annulations du HUB, réservé aux SUPERADMIN et MANAGER. */
export function CancellationControlScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canAccessHubCancellationControl(user.role) ? (
    <CancellationControl role={user.role} />
  ) : (
    <AccessDenied
      title="Accès réservé"
      text="Le contrôle des annulations est réservé aux comptes Manager et Super Admin."
    />
  );
}

function CancellationControl({ role }: { role: AppUserRole }) {
  const styles = useStyles();
  const t = useTheme();
  const params = useLocalSearchParams<{ ref?: string }>();

  const permissions = useMemo<RolePermissions>(
    () => ({
      recheckIgnore: canRecheckOrIgnoreCancellation(role),
      review: canReviewCreditNote(role),
    }),
    [role],
  );

  const [tab, setTab] = useState<CancellationControlTab>('pending');
  const [text, setText] = useState('');
  // Référence reçue en paramètre (lien depuis une notification) : filtre retirable.
  const [refFilter, setRefFilter] = useState(params.ref?.trim() ?? '');
  const [warehouse, setWarehouse] = useState('');

  const pendingQuery = useCancellationControlList('pending');
  const historyQuery = useCancellationControlList('history', tab === 'history');
  // Onglet « Validées » : super admin uniquement ; chargé d'emblée pour afficher son compteur.
  const reviewedQuery = useCancellationControlList('reviewed', permissions.review);
  const query = tab === 'history' ? historyQuery : tab === 'reviewed' ? reviewedQuery : pendingQuery;
  const { refreshing, onRefresh } = usePullToRefresh(query.refetch);
  const mutations = useCancellationControlMutations();

  const sourceItems = useMemo(() => {
    if (tab === 'history') return historyQuery.data?.items ?? [];
    if (tab === 'reviewed') return reviewedQuery.data?.items ?? [];
    if (tab === 'errors') return pendingQuery.data?.errors?.items ?? [];
    return pendingQuery.data?.items ?? [];
  }, [tab, pendingQuery.data, historyQuery.data, reviewedQuery.data]);

  const search = text.trim() || refFilter;
  const items = useMemo(
    () =>
      sourceItems.filter(
        (item) => (!warehouse || item.warehouse === warehouse) && matchesSearch(item, search),
      ),
    [sourceItems, warehouse, search],
  );

  const pendingCount = pendingQuery.data?.count ?? 0;
  const errorCount = pendingQuery.data?.errors?.count ?? 0;
  const historyCount = historyQuery.data?.count ?? 0;
  const reviewedCount = reviewedQuery.data?.count ?? 0;
  const creditNoteToValidateCount = pendingQuery.data?.creditNoteToValidateCount ?? 0;

  const purchaseTotal = useMemo(() => {
    const amounts = items
      .map((item) => item.estimatedPurchaseHT)
      .filter((value): value is number => typeof value === 'number');
    return amounts.length > 0 ? amounts.reduce((sum, value) => sum + value, 0) : null;
  }, [items]);
  const purchaseTotalLabel =
    purchaseTotal !== null ? ` · ${formatEuro(purchaseTotal)} HT d'achat estimé` : '';

  const segments = useMemo<Segment<CancellationControlTab>[]>(
    () => [
      { key: 'pending', label: 'BL présents', count: pendingCount },
      { key: 'errors', label: 'À revérifier', count: errorCount },
      { key: 'history', label: 'Historique' },
      ...(permissions.review
        ? [{ key: 'reviewed' as const, label: 'Validées', count: reviewedCount }]
        : []),
    ],
    [pendingCount, errorCount, reviewedCount, permissions.review],
  );

  const subtitle =
    tab === 'reviewed'
      ? `${plural(reviewedCount, "déclaration d'avoir validée", "déclarations d'avoir validées")} par le super admin${purchaseTotalLabel}`
      : tab === 'history'
        ? `${plural(historyCount, 'alerte résolue ou ignorée', 'alertes résolues ou ignorées')}${purchaseTotalLabel}`
        : tab === 'errors'
          ? `${plural(errorCount, 'contrôle eBatPro en erreur', 'contrôles eBatPro en erreur')}, à re-vérifier${purchaseTotalLabel}`
          : pendingCount === 0
            ? 'Aucune annulation validée avec un BL encore présent'
            : `${plural(pendingCount, 'annulation validée', 'annulations validées')} dont la commande existe encore dans eBatPro${
                creditNoteToValidateCount > 0
                  ? ` · ${plural(creditNoteToValidateCount, 'avoir à valider', 'avoirs à valider')}`
                  : ''
              }${purchaseTotalLabel}`;

  const emptyLabel =
    tab === 'reviewed'
      ? 'Aucune déclaration validée'
      : tab === 'history'
        ? 'Aucune alerte résolue ou ignorée'
        : tab === 'errors'
          ? 'Aucun contrôle en erreur'
          : 'Aucun BL encore présent après annulation';

  const pendingRow = (id: string): 'recheck' | 'validate' | 'review' | null => {
    if (mutations.recheck.isPending && mutations.recheck.variables === id) return 'recheck';
    if (mutations.validateCreditNote.isPending && mutations.validateCreditNote.variables === id)
      return 'validate';
    if (
      (mutations.reviewCreditNote.isPending && mutations.reviewCreditNote.variables === id) ||
      (mutations.unreviewCreditNote.isPending && mutations.unreviewCreditNote.variables === id)
    )
      return 'review';
    return null;
  };

  const handleOpenOrder = useCallback(
    (item: HubCancellationControlItem) => openCancellationOrder(item.orderReference),
    [],
  );
  const handleIgnore = useCallback(
    (item: HubCancellationControlItem) =>
      openCancellationIgnore(item.id, item.ebatRef || item.orderReference),
    [],
  );
  const { recheck, validateCreditNote, reviewCreditNote, unreviewCreditNote } = mutations;
  const handleRecheck = useCallback(
    (item: HubCancellationControlItem) => recheck.mutate(item.id),
    [recheck],
  );
  const handleValidate = useCallback(
    (item: HubCancellationControlItem) => validateCreditNote.mutate(item.id),
    [validateCreditNote],
  );
  const handleReview = useCallback(
    (item: HubCancellationControlItem) => reviewCreditNote.mutate(item.id),
    [reviewCreditNote],
  );
  const handleUnreview = useCallback(
    (item: HubCancellationControlItem) => unreviewCreditNote.mutate(item.id),
    [unreviewCreditNote],
  );

  const filtered = !!search || !!warehouse;
  const loading = query.isPending;

  return (
    <>
      <Stack.SearchBar
        placeholder="Rechercher une commande, un BL…"
        autoCapitalize="none"
        tintColor={t.accentText}
        hideWhenScrolling={false}
        obscureBackground={false}
        onChangeText={(event) => setText(event.nativeEvent.text)}
        onCancelButtonPress={() => setText('')}
      />
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        extraData={[
          mutations.recheck.isPending,
          mutations.validateCreditNote.isPending,
          mutations.reviewCreditNote.isPending,
          mutations.unreviewCreditNote.isPending,
        ]}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <CancellationControlCard
              item={item}
              tab={tab}
              actions={rowActions(item, tab, permissions)}
              pending={pendingRow(item.id)}
              highlighted={!!params.ref && item.orderReference === params.ref}
              onOpenOrder={handleOpenOrder}
              onRecheck={handleRecheck}
              onIgnore={handleIgnore}
              onValidateCreditNote={handleValidate}
              onReviewCreditNote={handleReview}
              onUnreviewCreditNote={handleUnreview}
            />
          </View>
        )}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={5}
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
            <View style={styles.padded}>
              <SegmentedControl segments={segments} value={tab} onChange={setTab} />
            </View>
            <View style={styles.chips}>
              <FilterPill
                label="Tous les entrepôts"
                state={warehouse === '' ? 'on' : 'off'}
                onPress={() => setWarehouse('')}
              />
              {WAREHOUSE_FILTERS.map((option) => (
                <FilterPill
                  key={option.value}
                  label={option.label}
                  state={warehouse === option.value ? 'on' : 'off'}
                  onPress={() => setWarehouse(warehouse === option.value ? '' : option.value)}
                />
              ))}
              {refFilter && !text.trim() ? (
                <FilterPill
                  label={refFilter}
                  state="on"
                  onPress={() => setRefFilter('')}
                  trailing={<X size={12} color={t.accentText} />}
                />
              ) : null}
            </View>
            <View style={styles.padded}>
              <View style={styles.summary}>
                <Text style={styles.subtitle}>{subtitle}</Text>
                {query.isFetching && !loading && !refreshing ? (
                  <ActivityIndicator size="small" color={t.accentText} />
                ) : null}
              </View>
              <Text style={styles.hint}>
                Contrôle eBatPro toutes les 30 min sur l&apos;entrepôt de la demande d&apos;annulation :
                une commande transférée ensuite vers un autre entrepôt n&apos;est pas recherchée dans ce
                dernier.
              </Text>
            </View>
            {query.error && items.length > 0 ? (
              <View style={styles.padded}>
                <ErrorBanner
                  error={query.error}
                  fallback="Impossible de charger le contrôle des annulations"
                  onRetry={() => void onRefresh()}
                />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.cardWrap}>
              <ListSkeleton rows={3} height={220} />
            </View>
          ) : query.error ? (
            <View style={styles.cardWrap}>
              <ErrorBanner
                error={query.error}
                fallback="Impossible de charger le contrôle des annulations"
                onRetry={() => void onRefresh()}
              />
            </View>
          ) : (
            <EmptyState
              icon={<ShieldCheck size={24} color={t.textMuted} />}
              title={emptyLabel}
              text={filtered ? 'Aucun résultat pour ces filtres.' : 'Tout est en ordre.'}
            />
          )
        }
      />
    </>
  );
}

const useStyles = makeStyles((t) => ({
  content: { flexGrow: 1, paddingBottom: spacing['4xl'] },
  header: { gap: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.sm },
  padded: { gap: spacing.xs + 2, paddingHorizontal: spacing.xl },
  cardWrap: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.xl },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  subtitle: { flex: 1, fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  hint: { fontSize: fontSize.xs, lineHeight: 17, color: t.textSubtle },
}));
