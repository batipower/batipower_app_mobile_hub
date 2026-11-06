import { RefreshControl, ScrollView, Text } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { PackageX } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubProductSheet } from '@/auth/permissions';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { SeeAllLink } from '@/features/search/components/SeeAllLink';
import { openOrdersList } from '@/features/search/navigation';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';

import { ProductHeader } from './components/ProductHeader';
import { ProductStock } from './components/ProductStock';
import { useProductDetail } from './hooks/useProductDetail';

/**
 * Fiche d'un produit, en lecture seule : identité, stock par entrepôt et agence, commandes
 * fournisseur, et accès aux commandes qui le contiennent. Réservée aux rôles SUPERADMIN et
 * MANAGER (comme `hub-app/products/*` côté back) : les autres comptes n'envoient aucun appel.
 */
export function ProductDetailScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canAccessHubProductSheet(user.role) ? (
    <ProductDetail />
  ) : (
    <AccessDenied
      title="Accès réservé"
      text="Les fiches produit sont réservées aux comptes Manager et Super Admin."
    />
  );
}

function ProductDetail() {
  const styles = useStyles();
  const t = useTheme();
  const { reference } = useLocalSearchParams<{ reference: string }>();
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
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

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
            <ProductStock
              header={header}
              stock={stock}
              loading={stockLoading}
              error={stockError}
              onRetry={() => void refetchStock()}
            />
            <Text style={styles.footnote}>
              Consultation en lecture seule. Les modifications se font depuis l&apos;espace web.
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
