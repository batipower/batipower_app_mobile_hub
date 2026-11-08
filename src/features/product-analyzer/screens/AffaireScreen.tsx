import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Handshake, Layers, List, Tag, Trash2 } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { Button } from '@/components/ui';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { formatDateTime, formatEuro, formatInteger, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import { hubProductAnalyzerApi } from '@/api/hubProductAnalyzer';

import { confirmDialog, refreshAnalyzerData } from '../bulkActions';
import { getPaFilters, patchPaFilters, resetPaFilters } from '../filtersStore';
import { useAffaireStats, useAffaires } from '../hooks/useStagingList';
import { apiErrorMessage } from '../lib/errors';
import { VIAB_STATUS_CFG } from '../lib/constants';
import { backToHistory, openPaEdit, openPaNego } from '../navigation';

/** Fiche d'une affaire (un fournisseur) : chiffres clés, produits filtrés, négociation et marque en bloc. */
export function AffaireScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useStyles();
  const t = useTheme();
  const affaires = useAffaires(true);
  const stats = useAffaireStats(id);
  const [deleting, setDeleting] = useState(false);
  const affaire = affaires.data?.find((a) => a.uuid === id);

  const refetchAll = useCallback(async () => {
    await Promise.all([affaires.refetch(), stats.refetch()]);
  }, [affaires, stats]);
  const { refreshing, onRefresh } = usePullToRefresh(refetchAll);

  const filterOnAffaire = useCallback(() => {
    if (!id) return;
    patchPaFilters({ affaire: true, affaireId: id });
  }, [id]);

  const onDelete = useCallback(async () => {
    if (!id || !affaire) return;
    const ok = await confirmDialog(
      "Supprimer l'affaire ?",
      `« ${affaire.name} » sera supprimée. ${
        affaire.stagingCount > 0 ? `Ses ${formatInteger(affaire.stagingCount)} produits ne seront pas supprimés, mais n’auront plus d’affaire.` : ''
      }`,
      'Supprimer',
      true,
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await hubProductAnalyzerApi.deleteAffaire(id);
      if (getPaFilters().affaireId === id) resetPaFilters();
      refreshAnalyzerData();
      toast.success('Affaire supprimée');
      router.back();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Suppression de l'affaire impossible"));
    } finally {
      setDeleting(false);
    }
  }, [id, affaire]);

  if (!id) return <EmptyState icon={<Layers size={28} color={t.textFaint} />} title="Affaire introuvable" text="Identifiant manquant." />;

  if (!stats.data && stats.isLoading) {
    return (
      <View style={styles.root}>
        <ListSkeleton />
      </View>
    );
  }

  if (!stats.data) {
    return (
      <View style={styles.root}>
        <ErrorBanner error={stats.error} fallback="Impossible de charger l'affaire" onRetry={() => void stats.refetch()} />
      </View>
    );
  }

  const s = stats.data;
  const viabilities = (Object.keys(VIAB_STATUS_CFG) as (keyof typeof VIAB_STATUS_CFG)[]).map((k) => ({
    key: k,
    ...VIAB_STATUS_CFG[k],
    count: s.byViability?.[k] ?? 0,
  }));

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={t.accentText} />}
    >
      <View style={styles.hero}>
        <Layers size={22} color={t.info} />
        <View style={styles.flex}>
          <Text style={styles.title} numberOfLines={2}>
            {affaire?.name ?? s.name}
          </Text>
          <Text style={styles.meta}>
            {affaire?.distributorName ?? 'Fournisseur non renseigné'}
            {affaire?.createdAt ? ` · créée le ${formatDateTime(affaire.createdAt)}` : ''}
          </Text>
          {affaire?.description ? <Text style={styles.desc}>{affaire.description}</Text> : null}
        </View>
      </View>

      <View style={styles.grid}>
        <Stat label="Produits" value={formatInteger(s.total)} />
        <Stat label="Marge moyenne" value={formatPercent(s.avgMarginPercent)} />
        <Stat label="Potentiel / mois" value={formatEuro(s.totalMonthlyPotential)} />
        <Stat label="Potentiel FR / mois" value={formatEuro(s.totalMonthlyPotentialFR)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Viabilité</Text>
        {viabilities.map((v) => (
          <View key={v.key} style={styles.barRow}>
            <Text style={styles.barLabel}>{v.label}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { backgroundColor: v.color, width: `${s.total > 0 ? Math.round((v.count / s.total) * 100) : 0}%` },
                ]}
              />
            </View>
            <Text style={styles.barCount}>{formatInteger(v.count)}</Text>
          </View>
        ))}
        {s.byWarehouse && Object.keys(s.byWarehouse).length > 0 ? (
          <Text style={styles.meta}>
            {Object.entries(s.byWarehouse)
              .map(([wh, n]) => `${wh} : ${formatInteger(n)}`)
              .join(' · ')}
          </Text>
        ) : null}
        {s.inCatalogueCount ? (
          <Text style={styles.meta}>{formatInteger(s.inCatalogueCount)} produits déjà au catalogue (analysés en forçant).</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button
          label="Voir les produits de l'affaire"
          leadingIcon={<List size={16} color="#fff" />}
          onPress={() => {
            filterOnAffaire();
            backToHistory();
          }}
        />
        <Button
          label="Négocier toute l'affaire"
          variant="secondary"
          leadingIcon={<Handshake size={16} color={t.text} />}
          disabled={s.total === 0}
          onPress={() => {
            filterOnAffaire();
            openPaNego('filter');
          }}
        />
        <Button
          label="Marque de l'affaire"
          variant="outline"
          leadingIcon={<Tag size={16} color={t.text} />}
          disabled={s.total === 0}
          onPress={() => openPaEdit('affaire-brand', { id })}
        />
        <Button
          label="Supprimer l'affaire"
          variant="ghost"
          leadingIcon={<Trash2 size={16} color={t.danger} />}
          loading={deleting}
          onPress={() => void onDelete()}
        />
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.bg },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  hero: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: t.text },
  meta: { fontSize: fontSize.xs, color: t.textMuted },
  desc: { fontSize: fontSize.sm, color: t.textMuted, marginTop: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: t.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    padding: spacing.md,
    gap: 2,
  },
  statValue: { fontSize: fontSize.xl, fontWeight: '800', color: t.text },
  statLabel: { fontSize: fontSize.xs, color: t.textMuted },
  card: {
    backgroundColor: t.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { width: 84, fontSize: fontSize.xs, color: t.textMuted },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: t.surface, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barCount: { width: 40, textAlign: 'right', fontSize: fontSize.xs, fontWeight: '700', color: t.text },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
}));
