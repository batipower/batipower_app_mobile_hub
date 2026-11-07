import { RefreshControl, SectionList, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';

import { useTabBarInset } from '@/components/navigation/tabBarInset';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { DriverTourAgency, DriverTourItem } from '@/types/preparation';

import { AgencyItemRow, AgencySectionHeader } from './AgencyTour';
import { EmptyState, ErrorBanner, ListSkeleton } from './ListState';

type AgencySection = {
  agency: DriverTourAgency;
  data: DriverTourItem[];
};

type AgencyListProps = {
  agencies: DriverTourAgency[];
  totalOrders: number;
  totalReferences: number;
  totalPieces: number;
  loading: boolean;
  error: unknown;
  refreshing: boolean;
  onRefresh: () => void;
};

/** « À chercher en agence » : une section par agence proche, avec les articles à récupérer. */
export function AgencyList({
  agencies,
  totalOrders,
  totalReferences,
  totalPieces,
  loading,
  error,
  refreshing,
  onRefresh,
}: AgencyListProps) {
  const styles = useStyles();
  const tabBarInset = useTabBarInset();
  const t = useTheme();
  const sections: AgencySection[] = agencies.map((agency) => ({ agency, data: agency.items }));

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item, index) => `${item.reference}-${index}`}
      renderSectionHeader={({ section }) => <AgencySectionHeader agency={section.agency} />}
      renderItem={({ item, index, section }) => (
        <AgencyItemRow item={item} last={index === section.data.length - 1} />
      )}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={[styles.content, { paddingBottom: tabBarInset + spacing.lg }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accentText} />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          {error ? (
            <ErrorBanner
              error={error}
              fallback="Impossible de charger la synthèse des agences"
              onRetry={onRefresh}
            />
          ) : null}
          {agencies.length > 0 ? (
            <Text style={styles.summary}>
              {totalOrders} commande{totalOrders > 1 ? 's' : ''} · {totalReferences} réf. ·{' '}
              {totalPieces} pièce{totalPieces > 1 ? 's' : ''} à récupérer
            </Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <ListSkeleton rows={3} height={150} />
        ) : error ? undefined : (
          <EmptyState
            icon={<MapPin size={24} color={t.textMuted} />}
            title="Rien à récupérer"
            text="Aucun article à récupérer en agence pour le moment."
          />
        )
      }
    />
  );
}

const useStyles = makeStyles((t) => ({
  content: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing['3xl'] },
  header: { gap: spacing.md },
  summary: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: t.warning,
  },
}));
