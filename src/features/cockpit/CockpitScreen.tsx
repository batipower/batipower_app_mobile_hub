import { useState } from 'react';
import { Platform, RefreshControl, ScrollView } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubCockpit } from '@/auth/permissions';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { useTabBarInset } from '@/components/navigation/tabBarInset';
import { makeStyles, spacing, useTheme } from '@/theme';

import { CaMonthSection } from './components/CaMonthSection';
import { CaTodayCard } from './components/CaTodayCard';
import { CockpitHeader } from './components/CockpitHeader';
import { LogisticsCard } from './components/LogisticsCard';
import { SavCard } from './components/SavCard';
import { SupportResponseCard } from './components/SupportResponseCard';
import { HUB_DASHBOARD_KEY, useCockpitOverview } from './hooks/useCockpitData';

/**
 * Cockpit du HUB, en consultation : CA du jour et du mois, logistique, SAV et délais du
 * support. Pendant mobile de la vue « Cockpit » de l'accueil HUB du front web, sans le
 * recalcul des marges ni les prix d'achat actuels.
 */
export function CockpitScreen() {
  const { user } = useAuth();
  if (!user) return null;
  // Le contenu est un composant à part : les requêtes ne partent pas pour un compte sans accès.
  return canAccessHubCockpit(user.role) ? (
    <CockpitContent />
  ) : (
    <AccessDenied text="Le cockpit est réservé aux comptes Super Admin." />
  );
}

function CockpitContent() {
  const styles = useStyles();
  const tabBarInset = useTabBarInset();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { overview, loading, error, refetch } = useCockpitOverview();
  // La marge reste masquée tant qu'on ne la demande pas : un tiers peut voir l'écran.
  const [showMargin, setShowMargin] = useState(false);

  // Tirer pour rafraîchir recharge toute la page : vue d'ensemble, histogramme et support.
  const { refreshing, onRefresh } = usePullToRefresh(() =>
    queryClient.refetchQueries({ queryKey: HUB_DASHBOARD_KEY, type: 'active' }),
  );

  return (
    <ScrollView
      style={styles.scroll}
      contentInsetAdjustmentBehavior="automatic"
      // Sur iOS, `contentInsetAdjustmentBehavior="automatic"` ajoute déjà la zone sûre du haut
      // (et la barre d'onglets en bas) : y ajouter `insets.top` doublerait le vide avant le titre.
      contentContainerStyle={[
        styles.content,
        { paddingTop: Platform.OS === 'ios' ? spacing.md : insets.top + spacing.md },
        { paddingBottom: tabBarInset + spacing.lg },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={t.accentText}
        />
      }
    >
      <CockpitHeader
        generatedAt={overview?.generatedAt ?? null}
        marketplaceSync={overview?.marketplaceSync}
      />

      {error ? (
        <ErrorBanner
          error={error}
          fallback="Impossible de charger le cockpit"
          onRetry={() => void refetch()}
        />
      ) : null}

      {loading && !overview ? <ListSkeleton rows={3} height={200} /> : null}

      {overview ? (
        <>
          {overview.finance ? (
            <>
              <CaTodayCard
                finance={overview.finance}
                showMargin={showMargin}
                onToggleMargin={() => setShowMargin((value) => !value)}
              />
              <CaMonthSection showMargin={showMargin} />
            </>
          ) : null}
          <LogisticsCard logistics={overview.logistics} />
          <SavCard sav={overview.sav} />
        </>
      ) : null}

      <SupportResponseCard />
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  scroll: { flex: 1, backgroundColor: t.bg },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'], gap: spacing.lg },
}));
