import type { ReactNode } from 'react';
import { Platform, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { ModuleSwitcherButton } from '@/components/modules/ModuleSwitcherButton';
import { HubViewMenu } from '@/features/cockpit/components/HubViewMenu';
import { hubViewMeta, type HubView } from '@/features/cockpit/hubViews';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { useTabBarInset } from '@/components/navigation/tabBarInset';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';

/** Préfixe commun des requêtes des vues Site, Stats PARTNER et Financier (remise à zéro groupée). */
export const HUB_VIEWS_KEY = ['hub-dashboard-views'] as const;

type HubDashboardScreenProps = {
  view: Exclude<HubView, 'cockpit'>;
  /** Phrase d'introduction sous le titre (fraîcheur des chiffres, périmètre). */
  subtitle?: string | null;
  /** Rend le contenu ; monté seulement pour un compte autorisé, donc ses requêtes ne partent pas sinon. */
  children: ReactNode;
};

/**
 * Coque des vues Site, Stats PARTNER et Financier : titre déroulant (même sélecteur que le
 * Cockpit), pastille de module, tirer pour rafraîchir et refus d'accès pour un compte sans droit.
 */
export function HubDashboardScreen({ view, subtitle, children }: HubDashboardScreenProps) {
  const { user } = useAuth();
  if (!user) return null;

  const meta = hubViewMeta(view);
  if (!meta.allowed(user.role)) {
    return <AccessDenied text={`La vue « ${meta.label} » est réservée aux comptes Super Admin.`} />;
  }

  return (
    <Scroller view={view} subtitle={subtitle}>
      {children}
    </Scroller>
  );
}

function Scroller({ view, subtitle, children }: HubDashboardScreenProps) {
  const styles = useStyles();
  const tabBarInset = useTabBarInset();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { refreshing, onRefresh } = usePullToRefresh(() =>
    queryClient.refetchQueries({ queryKey: HUB_VIEWS_KEY, type: 'active' }),
  );

  return (
    <ScrollView
      style={styles.scroll}
      contentInsetAdjustmentBehavior="automatic"
      // Même réglage que le Cockpit : iOS ajoute déjà la zone sûre du haut.
      contentContainerStyle={[
        styles.content,
        { paddingTop: Platform.OS === 'ios' ? spacing.md : insets.top + spacing.md },
        { paddingBottom: tabBarInset + spacing.lg },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={t.accentText}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.text}>
          <HubViewMenu current={view} />
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <ModuleSwitcherButton active="HUB" />
      </View>
      {children}
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  scroll: { flex: 1, backgroundColor: t.bg },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'], gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  text: { flex: 1, gap: 2 },
  subtitle: { fontSize: fontSize.xs, color: t.textSubtle },
}));
