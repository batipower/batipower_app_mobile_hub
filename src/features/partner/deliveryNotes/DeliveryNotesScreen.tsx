import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { FileWarning, X } from 'lucide-react-native';

import { FilterPill } from '@/components/sheet/FilterPill';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { PartnerDeliveryNoteErrorLine } from '@/types/partnerDeliveryNotes';

import { openDeliveryNote, openDeliveryNoteFilters } from '../navigation';
import { FilterPillRow, PartnerListScreen } from '../shared/PartnerListScreen';
import { plural } from '../shared/pages';
import { DeliveryNoteLineCard } from './components/DeliveryNoteLineCard';
import {
  patchDeliveryNotesFilters,
  useDeliveryNotesFilters,
  type DeliveryNoteView,
} from './filtersStore';
import { useDeliveryNoteLines, useDeliveryNoteProgress } from './hooks/useDeliveryNoteLines';

const keyExtractor = (line: PartnerDeliveryNoteErrorLine) =>
  `${line.deliveryNoteUuid}:${line.ebatRef}`;
const renderItem = (line: PartnerDeliveryNoteErrorLine) => (
  <DeliveryNoteLineCard line={line} onPress={openDeliveryNote} />
);

/**
 * BL à corriger du module PARTNER : lignes de bons de livraison dont le prix lu s'écarte du prix
 * attendu. « À traiter » / « Traités » reprend les vues du web ; la barre de progression compte
 * les lignes traitées sur le total de la marque choisie. Un appui ouvre le BL parent.
 */
export function DeliveryNotesScreen() {
  const t = useTheme();
  const styles = useStyles();
  const filters = useDeliveryNotesFilters();
  const list = useDeliveryNoteLines(filters);
  const progress = useDeliveryNoteProgress(filters.brand);

  const segments = useMemo(
    () => [
      {
        key: 'pending' as const,
        label: 'À traiter',
        count: progress.loaded ? progress.pending : undefined,
      },
      {
        key: 'treated' as const,
        label: 'Traités',
        count: progress.loaded ? progress.treated : undefined,
      },
    ],
    [progress.loaded, progress.pending, progress.treated],
  );

  return (
    <PartnerListScreen<PartnerDeliveryNoteErrorLine, DeliveryNoteView>
      title="BL à corriger"
      list={list}
      totalLabel={list.total === null ? null : plural(list.total, 'ligne en écart', 'lignes en écart')}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      segments={segments}
      segment={filters.view}
      onSegmentChange={(view) => patchDeliveryNotesFilters({ view })}
      activeFilterCount={filters.brand ? 1 : 0}
      onOpenFilters={openDeliveryNoteFilters}
      notice={
        progress.loaded && progress.total > 0 ? (
          <View style={styles.progress} accessibilityLabel={`${progress.treated} traités sur ${progress.total}`}>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${progress.percent}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {progress.treated} traités · {progress.percent} %
            </Text>
          </View>
        ) : null
      }
      filterPills={
        filters.brand ? (
          <FilterPillRow>
            <FilterPill
              label={filters.brand}
              state="on"
              onPress={() => patchDeliveryNotesFilters({ brand: null })}
              trailing={<X size={12} color={t.accentText} />}
            />
          </FilterPillRow>
        ) : null
      }
      errorFallback="Impossible de charger les BL"
      emptyIcon={<FileWarning size={24} color={t.textMuted} />}
      emptyTitle={filters.view === 'pending' ? 'Aucune ligne à traiter' : 'Aucune ligne traitée'}
      emptyText={
        filters.view === 'pending'
          ? "Aucun BL n'a d'écart de prix à corriger pour le moment."
          : "Aucun BL n'a encore été traité."
      }
      emptyFilteredText="Aucune ligne ne correspond à cette marque."
      skeletonHeight={150}
    />
  );
}

const useStyles = makeStyles((t) => ({
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  track: {
    flex: 1,
    height: 6,
    overflow: 'hidden',
    borderRadius: radius.full,
    backgroundColor: t.surfaceStrong,
  },
  fill: { height: '100%', borderRadius: radius.full, backgroundColor: t.success },
  progressText: { fontSize: fontSize.xs, fontWeight: '600', color: t.textMuted },
}));
