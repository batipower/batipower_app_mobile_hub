import { useCallback } from 'react';
import { RefreshControl, ScrollView, Text } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { PackageX } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubProductSheet, canEditHubWebsitePrice } from '@/auth/permissions';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { Segment, SegmentedControl } from '@/features/preparation/components/SegmentedControl';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { SeeAllLink } from '@/features/search/components/SeeAllLink';
import { openOrdersList } from '@/features/search/navigation';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import { useQueryClient } from '@tanstack/react-query';

import { ProductHeader } from './components/ProductHeader';
import { ProductStock } from './components/ProductStock';
import { ProductWebsitePricing } from './components/ProductWebsitePricing';
import { useProductDetail } from './hooks/useProductDetail';
import { MarketplacesTab } from './marketplaces/MarketplacesTab';
import { productPricingKey } from './marketplaces/hooks/useProductPricing';

type Tab = 'fiche' | 'marketplaces';

const TABS: readonly Segment<Tab>[] = [
  { key: 'fiche', label: 'Fiche' },
  { key: 'marketplaces', label: 'Marketplaces' },
];

/**
 * Fiche d'un produit : identité, prix du site avec sa marge (modifiable, SUPERADMIN), stock par
 * entrepôt et agence, commandes fournisseur, et accès aux commandes qui le contiennent. Réservée
 * aux rôles SUPERADMIN et MANAGER (comme `hub-app/products/*` côté back) : les autres comptes
 * n'envoient aucun appel. Un sélecteur « Fiche / Marketplaces » (paramètre d'URL `onglet`) donne
 * accès aux prix pratiqués sur les marketplaces, modifiables par le SUPERADMIN.
 */
export function ProductDetailScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canAccessHubProductSheet(user.role) ? (
    <ProductDetail canEditWebsitePrice={canEditHubWebsitePrice(user.role)} />
  ) : (
    <AccessDenied
      title="Accès réservé"
      text="Les fiches produit sont réservées aux comptes Manager et Super Admin."
    />
  );
}

function ProductDetail({ canEditWebsitePrice }: { canEditWebsitePrice: boolean }) {
  const styles = useStyles();
  const t = useTheme();
  const { reference, onglet } = useLocalSearchParams<{ reference: string; onglet?: string }>();
  const queryClient = useQueryClient();
  const tab: Tab = onglet === 'marketplaces' ? 'marketplaces' : 'fiche';
  const {
    header,
    stock,
    notFound,
    headerLoading,
    headerError,
    stockLoading,
    stockError,
    refetch,
    refetchStock,
  } = useProductDetail(reference, true);
  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetch(),
      tab === 'marketplaces'
        ? queryClient.refetchQueries({ queryKey: productPricingKey(reference) })
        : undefined,
    ]);
  }, [refetch, queryClient, reference, tab]);
  const { refreshing, onRefresh } = usePullToRefresh(refetchAll);

  return (
    <>
      <Stack.Screen options={{ title: reference ?? 'Produit' }} />
      <ScrollView
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
        {headerLoading ? <ListSkeleton rows={3} height={150} /> : null}
        {headerError ? (
          <ErrorBanner
            error={headerError}
            fallback="Impossible de charger le produit"
            onRetry={() => void onRefresh()}
          />
        ) : null}
        {notFound ? (
          <EmptyState
            icon={<PackageX size={24} color={t.textMuted} />}
            title="Produit introuvable"
            text="Aucun produit ne correspond à cette référence."
          />
        ) : null}
        {header ? (
          <>
            <ProductHeader header={header} />
            <SeeAllLink
              label="Voir les commandes contenant ce produit"
              onPress={() => openOrdersList({ produit: header.reference })}
            />
            <SegmentedControl
              segments={TABS}
              value={tab}
              onChange={(next) => router.setParams({ onglet: next === 'fiche' ? undefined : next })}
            />
            {tab === 'marketplaces' ? (
              <MarketplacesTab header={header} canEdit={canEditWebsitePrice} />
            ) : (
              <>
                {canEditWebsitePrice ? <ProductWebsitePricing reference={header.reference} /> : null}
                <ProductStock
                  header={header}
                  stock={stock}
                  loading={stockLoading}
                  error={stockError}
                  onRetry={() => void refetchStock()}
                />
              </>
            )}
            <Text style={styles.footnote}>
              {canEditWebsitePrice
                ? tab === 'marketplaces'
                  ? "Les offres, l'objectif et la commission se modifient depuis le menu de chaque marketplace. Les autres modifications se font depuis l'espace web."
                  : "Le prix du site se modifie ici, les offres marketplace depuis l'onglet Marketplaces. Les autres modifications se font depuis l'espace web."
                : "Consultation en lecture seule. Les modifications se font depuis l'espace web."}
            </Text>
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  scroll: { flex: 1, backgroundColor: t.bg },
  content: { padding: spacing.xl, gap: spacing['2xl'], paddingBottom: spacing['4xl'] },
  footnote: {
    paddingHorizontal: spacing.lg,
    textAlign: 'center',
    fontSize: fontSize.xs,
    lineHeight: 17,
    color: t.textFaint,
  },
}));
