import type { ReactNode } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { SearchX } from 'lucide-react-native';

import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { makeStyles, spacing, useTheme } from '@/theme';

type DetailScrollProps = {
  loading: boolean;
  error: unknown;
  notFound?: boolean;
  notFoundTitle: string;
  notFoundText: string;
  errorFallback: string;
  refetch: () => Promise<unknown>;
  /** Contenu de la fiche, rendu une fois la donnée chargée. */
  children: ReactNode;
  /** Pied fixe de contenu (espace réservé sous les actions), en points. */
  bottomSpace?: number;
};

/**
 * Cadre commun des fiches PARTNER (produit, opportunité, commande inter-agence, BL) : tirer pour
 * actualiser, squelette de chargement, erreur avec relance et fiche introuvable.
 */
export function DetailScroll({
  loading,
  error,
  notFound = false,
  notFoundTitle,
  notFoundText,
  errorFallback,
  refetch,
  children,
  bottomSpace = spacing['4xl'],
}: DetailScrollProps) {
  const styles = useStyles();
  const t = useTheme();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}
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
      {loading ? <ListSkeleton rows={3} height={140} /> : null}
      {!loading && notFound ? (
        <EmptyState
          icon={<SearchX size={24} color={t.textMuted} />}
          title={notFoundTitle}
          text={notFoundText}
        />
      ) : null}
      {!loading && !notFound && error ? (
        <ErrorBanner error={error} fallback={errorFallback} onRetry={() => void onRefresh()} />
      ) : null}
      {!loading && !notFound && !error ? children : null}
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  scroll: { flex: 1, backgroundColor: t.bg },
  content: { padding: spacing.xl, gap: spacing['2xl'] },
}));
