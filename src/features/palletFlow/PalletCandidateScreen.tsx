import { RefreshControl, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { PackageX } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubPalletFlow, canAccessHubProductSheet } from '@/auth/permissions';
import { OrderDetail } from '@/features/orders/components/OrderDetail';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { openProduct } from '@/features/search/navigation';
import { makeStyles, spacing, useTheme } from '@/theme';

import { PalletActionsSection } from './components/PalletActionsSection';
import { PalletMarginSection } from './components/PalletMarginSection';
import { PalletStatusSection } from './components/PalletStatusSection';
import { canArbitrate } from './display';
import { usePalletCandidate } from './hooks/usePalletCandidate';

/**
 * Page d'arbitrage d'une commande candidate palette, ouverte depuis le push « Commande à
 * arbitrer » ou la liste « Candidats palette » : statut, marge actuelle, décision (prix palette ou
 * flux classique), puis le détail complet de la commande (client, adresse de livraison, articles).
 * Réservée au SUPERADMIN.
 */
export function PalletCandidateScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canAccessHubPalletFlow(user.role) ? (
    <PalletCandidate />
  ) : (
    <AccessDenied
      title="Accès réservé"
      text="L'arbitrage des commandes palette est réservé aux comptes Super Admin."
    />
  );
}

function PalletCandidate() {
  const styles = useStyles();
  const t = useTheme();
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const { user } = useAuth();
  const data = usePalletCandidate(reference);
  const { detail, notFound, loading, error } = data.order;
  const { refreshing, onRefresh } = usePullToRefresh(data.refetch);

  const canOpenProducts = !!user && canAccessHubProductSheet(user.role);

  return (
    <>
      <Stack.Screen options={{ title: reference ?? 'Commande palette' }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={t.accentText}
          />
        }
      >
        {loading ? <ListSkeleton rows={4} height={140} /> : null}
        {error ? (
          <ErrorBanner
            error={error}
            fallback="Impossible de charger la commande"
            onRetry={() => void onRefresh()}
          />
        ) : null}
        {notFound ? (
          <EmptyState
            icon={<PackageX size={24} color={t.textMuted} />}
            title="Commande introuvable"
            text="Aucune commande ne correspond à cette référence."
          />
        ) : null}
        {detail ? (
          <>
            <PalletStatusSection order={detail.order} quotes={data.quotes} />
            <PalletMarginSection
              order={detail.order}
              quotes={data.quotes}
              simulation={data.margin}
              loading={data.marginLoading}
              failed={!!data.marginError}
              onRetry={() => void data.refetchMargin()}
            />
            {canArbitrate(detail.order) ? <PalletActionsSection order={detail.order} /> : null}
            <OrderDetail
              data={detail}
              onOpenProduct={canOpenProducts ? openProduct : undefined}
              hideFootnote
            />
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  scroll: { flex: 1, backgroundColor: t.bg },
  content: { padding: spacing.xl, gap: spacing['2xl'], paddingBottom: spacing['4xl'] },
}));
