import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { X } from 'lucide-react-native';

import { Chip } from '@/components/ui';
import { FilterPill } from '@/components/sheet/FilterPill';
import { VIAB_STATUS_CFG } from '@/features/product-analyzer/lib/constants';
import { buildStagingFilterChips } from '@/features/product-analyzer/lib/filter-labels';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { StagingFilters, StagingStatus, ViabilityTab } from '@/types/hubProductAnalyzer';

import { patchPaFilters, resetPaFilters, usePaFilters } from '../filtersStore';
import { useDistributors } from '../hooks/useDistributors';
import { useAffaires, type ViabilityCounts } from '../hooks/useStagingList';

const VIABILITY_TABS: { key: ViabilityTab; label: string; color?: string; count: keyof ViabilityCounts }[] = [
  { key: 'all', label: 'Tous', count: 'total' },
  { key: 'viable', label: 'Viable', color: VIAB_STATUS_CFG.VIABLE.color, count: 'viable' },
  { key: 'negotiable', label: 'À négocier', color: VIAB_STATUS_CFG.NEGOTIABLE.color, count: 'negotiable' },
  { key: 'not_viable', label: 'Non viable', color: VIAB_STATUS_CFG.NOT_VIABLE.color, count: 'not_viable' },
];

/** Onglets de viabilité avec leurs compteurs (calculés sur les autres filtres). */
export function ViabilityTabs({ counts }: { counts: ViabilityCounts | undefined }) {
  const styles = useStyles();
  const { viability } = usePaFilters();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
    >
      {VIABILITY_TABS.map((tab) => (
        <Chip
          key={tab.key}
          label={tab.label}
          count={counts?.[tab.count]}
          active={viability === tab.key}
          icon={tab.color ? <View style={[styles.dot, { backgroundColor: tab.color }]} /> : undefined}
          onPress={() => patchPaFilters({ viability: tab.key })}
        />
      ))}
    </ScrollView>
  );
}

const STATUS_PILLS: { value: StagingStatus | ''; label: string }[] = [
  { value: 'PENDING', label: 'En attente' },
  { value: '', label: 'Tous' },
  { value: 'LAUNCHED', label: 'Lancés' },
  { value: 'EBAT_NOT_FOUND', label: 'Introuvables' },
];

/** Statut (segmenté) puis raccourcis des filtres les plus utilisés. */
export function QuickFilters() {
  const styles = useStyles();
  const t = useTheme();
  const f = usePaFilters();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.segment} accessibilityRole="tablist">
        {STATUS_PILLS.map((s) => {
          const active = f.status === s.value;
          return (
            <Pressable
              key={s.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => patchPaFilters({ status: s.value })}
              style={[styles.segmentItem, active && { backgroundColor: t.accent }]}
            >
              <Text style={[styles.segmentText, active && { color: t.onAccent }]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <FilterPill
        label="Poids manquant"
        state={f.weight === 'pending' ? 'on' : 'off'}
        onPress={() => patchPaFilters({ weight: f.weight === 'pending' ? '' : 'pending' })}
      />
      <FilterPill
        label="Négo en cours"
        state={f.hasNego ? 'on' : 'off'}
        onPress={() => patchPaFilters({ hasNego: !f.hasNego, needsNego: false })}
      />
      <FilterPill
        label="Sans négo"
        state={f.needsNego ? 'on' : 'off'}
        onPress={() => patchPaFilters({ needsNego: !f.needsNego, hasNego: false })}
      />
      <FilterPill
        label="En stock"
        state={f.inStock ? 'on' : 'off'}
        onPress={() => patchPaFilters({ inStock: !f.inStock })}
      />
      <FilterPill
        label="Ventes MP"
        state={f.minSales ? 'on' : 'off'}
        onPress={() => patchPaFilters({ minSales: !f.minSales })}
      />
    </ScrollView>
  );
}

type Chipish = { key: string; label: string; clearPatch: Partial<StagingFilters> };

/** Puces des filtres actifs (hors recherche, visible dans la barre native), chacune retirable. */
export function ActiveChips() {
  const styles = useStyles();
  const t = useTheme();
  const f = usePaFilters();
  const { byId } = useDistributors({ enabled: !!f.distributorId || f.stockDistributorIds.length > 0 });
  const { data: affaires } = useAffaires(f.affaire && !!f.affaireId);

  const chips = useMemo<Chipish[]>(() => {
    const base: Chipish[] = buildStagingFilterChips(f, (id) => byId(id)?.name ?? id).filter(
      // Statut et viabilité ont leurs propres contrôles visibles.
      (c) => c.key !== 'search' && c.key !== 'viability' && c.key !== 'status',
    );
    if (f.affaire && f.affaireId) {
      const name = affaires?.find((a) => a.uuid === f.affaireId)?.name;
      base.push({
        key: 'affaire',
        label: `Affaire : ${name ?? '…'}`,
        clearPatch: { affaire: false, affaireId: '' },
      });
    }
    if (f.distributorId) {
      base.push({
        key: 'distributor',
        label: `Fournisseur : ${byId(f.distributorId)?.name ?? '…'}`,
        clearPatch: { distributorId: '', offerTrack: '', missingCode: false },
      });
    }
    if (f.offerTrack) {
      base.push({
        key: 'offerTrack',
        label: f.offerTrack === 'DISTRIBUTOR_CLEARANCE' ? 'Destockage' : 'Offre standard',
        clearPatch: { offerTrack: '' },
      });
    }
    if (f.missingCode) {
      base.push({ key: 'missingCode', label: 'Sans code fournisseur', clearPatch: { missingCode: false } });
    }
    return base;
  }, [f, byId, affaires]);

  if (chips.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {chips.map((chip) => (
        <FilterPill
          key={chip.key}
          label={chip.label}
          state="on"
          onPress={() => patchPaFilters(chip.clearPatch)}
          trailing={<X size={12} color={t.accentText} />}
        />
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Effacer tous les filtres"
        hitSlop={8}
        onPress={resetPaFilters}
      >
        <Text style={styles.clear}>Tout effacer</Text>
      </Pressable>
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  row: { paddingHorizontal: spacing.xl, gap: spacing.sm, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  segment: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: radius.full,
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
  },
  segmentItem: {
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  segmentText: { fontSize: fontSize.xs, fontWeight: '700', color: t.textMuted },
  clear: { fontSize: fontSize.xs, fontWeight: '700', color: t.accentText, paddingHorizontal: spacing.sm },
}));
