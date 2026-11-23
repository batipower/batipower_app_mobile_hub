import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { PackageX } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubPreparation } from '@/auth/permissions';
import { DetailSection } from '@/components/ui';
import { ProductStock } from '@/features/products/components/ProductStock';
import { useProductDetail } from '@/features/products/hooks/useProductDetail';
import { fontSize, makeStyles, monoFontFamily, spacing, useTheme } from '@/theme';

import { AccessDenied } from './components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from './components/ListState';
import { usePullToRefresh } from './hooks/usePullToRefresh';

/**
 * Stock réseau d'une référence de l'onglet « En agence » : entrepôts (QG, Flevy, Dombasle) et
 * agences, avec les lieux dont le stock couvre la quantité à récupérer mis en évidence. L'équipe
 * choisit elle-même l'agence selon sa position. Mêmes rôles que la Préparation (SUPERADMIN et
 * MANAGER) ; le back assainit les prix d'achat pour le MANAGER.
 */
export function StockNetworkScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canAccessHubPreparation(user.role) ? <StockNetwork /> : <AccessDenied />;
}

function StockNetwork() {
  const styles = useStyles();
  const t = useTheme();
  const { reference, quantity, agency } = useLocalSearchParams<{
    reference: string;
    quantity?: string;
    agency?: string;
  }>();
  const needed = Number.parseInt(quantity ?? '', 10);
  const minStock = Number.isFinite(needed) && needed > 0 ? needed : undefined;

  const { header, stock, notFound, headerLoading, headerError, stockLoading, stockError, refetch, refetchStock } =
    useProductDetail(reference, true);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  return (
    <>
      <Stack.Screen options={{ title: 'Stock réseau' }} />
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
        <DetailSection title="À récupérer">
          <Text style={styles.reference}>{reference}</Text>
          {header?.designation ? <Text style={styles.designation}>{header.designation}</Text> : null}
          <View style={styles.pills}>
            {minStock ? <Text style={styles.need}>{minStock} pièce{minStock > 1 ? 's' : ''}</Text> : null}
            {agency ? <Text style={styles.meta}>prévues à {agency}</Text> : null}
          </View>
          {minStock ? (
            <Text style={styles.meta}>
              Les stocks entourés en vert couvrent la quantité demandée.
            </Text>
          ) : null}
        </DetailSection>

        {headerLoading ? <ListSkeleton rows={2} height={120} /> : null}
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
          <ProductStock
            header={header}
            stock={stock}
            loading={stockLoading}
            error={stockError}
            onRetry={() => void refetchStock()}
            highlightMinStock={minStock}
          />
        ) : null}
      </ScrollView>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  scroll: { flex: 1, backgroundColor: t.bg },
  content: { padding: spacing.xl, gap: spacing['2xl'], paddingBottom: spacing['4xl'] },
  reference: {
    fontFamily: monoFontFamily,
    fontSize: fontSize.base,
    fontWeight: '700',
    color: t.accentText,
  },
  designation: { fontSize: fontSize.sm, lineHeight: 20, color: t.textMuted },
  pills: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: spacing.sm },
  need: { fontSize: fontSize.lg, fontWeight: '800', color: t.text },
  meta: { fontSize: fontSize.xs, color: t.textSubtle },
}));
