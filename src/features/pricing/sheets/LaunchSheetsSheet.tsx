import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Switch, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hubProductStudioJobsApi } from '@/api/hubProductStudioJobs';
import { dismissSheetThen } from '@/components/sheet/dismissSheet';
import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button } from '@/components/ui';
import { errorMessage } from '@/features/preparation/components/ListState';
import { fontSize, makeStyles, monoFontFamily, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { HubPricingRow } from '@/types/hubPricing';
import type { StudioBulkOutcome, StudioEstimateItem } from '@/types/hubStudioJobs';

import { openQueue } from '@/features/product-studio/navigation';

import { PRICING_LIST_KEY } from '../queryKeys';
import { clearSheetSelection, useSheetSelection } from '../sheetSelectionStore';

/** Plafond serveur d'un envoi (estimation et préparation) : au-delà, on découpe. */
const CHUNK_SIZE = 500;

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function estimateAll(references: string[], signal?: AbortSignal): Promise<StudioEstimateItem[]> {
  const parts = await Promise.all(
    chunk(references, CHUNK_SIZE).map((refs) => hubProductStudioJobsApi.estimate(refs, { signal })),
  );
  return parts.flatMap((p) => p.items);
}

const average = (values: number[]) =>
  values.length === 0
    ? null
    : Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

type LaunchResult = {
  outcomes: { outcome: StudioBulkOutcome; refs: string[] }[];
  error: unknown;
  lotCount: number;
};

/**
 * Lancement groupé des fiches produit depuis Pricing (miroir de `BulkSheetLaunchDialog` du web) :
 * estimation des notes sans IA, exclusion ligne à ligne, puis préparation IA en arrière-plan avec
 * publication automatique des fiches prêtes (SUPERADMIN), par lots de 500.
 */
export function LaunchSheetsSheet() {
  const styles = useStyles();
  const t = useTheme();
  const queryClient = useQueryClient();
  const selection = useSheetSelection();
  const rows = useMemo(() => [...selection.values()], [selection]);
  const references = useMemo(() => rows.map((row) => row.reference), [rows]);
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(() => new Set());

  const estimateQuery = useQuery({
    queryKey: ['studio-estimate', references],
    queryFn: ({ signal }) => estimateAll(references, signal),
    enabled: references.length > 0,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });

  const estimateByRef = useMemo(() => {
    const map = new Map<string, StudioEstimateItem>();
    for (const item of estimateQuery.data ?? []) map.set(item.reference, item);
    return map;
  }, [estimateQuery.data]);

  const included = useMemo(
    () => references.filter((ref) => !excluded.has(ref)),
    [references, excluded],
  );

  const summary = useMemo(() => {
    const est = included
      .map((ref) => estimateByRef.get(ref))
      .filter((r): r is StudioEstimateItem => Boolean(r));
    const scored = est.filter((r) => r.currentScore !== null);
    return {
      averageBefore: average(scored.map((r) => r.currentScore as number)),
      averageAfter: average(
        scored.filter((r) => r.estimatedScore !== null).map((r) => r.estimatedScore as number),
      ),
      likelyPublishable: est.filter((r) => r.likelyPublishable).length,
      likelyBlocked: est.filter((r) => r.currentScore !== null && !r.likelyPublishable).length,
    };
  }, [included, estimateByRef]);

  const launch = useMutation<LaunchResult>({
    mutationFn: async () => {
      // Un envoi par lot de 500 : si l'un échoue, les lots déjà partis continuent côté serveur.
      const lots = chunk(included, CHUNK_SIZE);
      const outcomes: LaunchResult['outcomes'] = [];
      let error: unknown = null;
      for (const refs of lots) {
        try {
          outcomes.push({
            outcome: await hubProductStudioJobsApi.prepareBulk(refs, { autoDeploy: true }),
            refs,
          });
        } catch (e) {
          error = e;
          break;
        }
      }
      return { outcomes, error, lotCount: lots.length };
    },
    onSuccess: ({ outcomes, error, lotCount }) => {
      // Rien n'est parti : on garde la sélection et la feuille ouverte pour réessayer.
      if (outcomes.length === 0 && error) {
        Alert.alert('Lancement impossible', errorMessage(error, 'Réessayez dans un instant.'));
        return;
      }

      const created = outcomes.reduce((n, o) => n + o.outcome.created, 0);
      const already = outcomes.reduce((n, o) => n + o.outcome.alreadyActive, 0);
      const refused = outcomes.reduce(
        (n, o) => n + o.outcome.failed.length + o.outcome.invalid.length,
        0,
      );

      const lines: string[] = [];
      if (created > 0) {
        lines.push(
          `${plural(created, 'fiche')} ${created > 1 ? 'lancées' : 'lancée'} en arrière-plan` +
            (already > 0 ? ` (${already} déjà en cours)` : '') +
            '.',
        );
      } else if (already > 0) {
        lines.push('Toutes les fiches sont déjà en cours de traitement.');
      } else {
        lines.push('Aucune fiche lancée.');
      }
      if (refused > 0) {
        lines.push(`${plural(refused, 'fiche')} ${refused > 1 ? 'refusées' : 'refusée'} par le serveur.`);
      }
      if (error) {
        lines.push(
          `Envoi interrompu après ${outcomes.length}/${lotCount} lot${lotCount > 1 ? 's' : ''} : ` +
            `${errorMessage(error, 'erreur inconnue')}. Les fiches déjà lancées continuent.`,
        );
      }

      void queryClient.invalidateQueries({ queryKey: PRICING_LIST_KEY });
      // La sélection n'est vidée qu'une fois la feuille fermée (sinon sa liste se vide à l'écran).
      dismissSheetThen(() => {
        clearSheetSelection();
        Alert.alert('Génération des fiches', lines.join('\n\n'), [
          { text: 'Fermer', style: 'cancel' },
          ...(created > 0 || already > 0
            ? [{ text: 'Voir la file', onPress: () => openQueue() }]
            : []),
        ]);
      });
    },
    onError: (error) => {
      Alert.alert('Lancement impossible', errorMessage(error, 'Réessayez dans un instant.'));
    },
  });

  const toggleIncluded = (reference: string, on: boolean) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (on) next.delete(reference);
      else next.add(reference);
      return next;
    });

  const loading = estimateQuery.isLoading;
  const n = included.length;

  const summaryValue = (value: string) => (loading ? '…' : value);

  return (
    <SheetScreen
      title="Lancer les fiches produit"
      closeLabel="Annuler"
      closeDisabled={launch.isPending}
      scroll={false}
      footer={
        <Button
          label={n === 0 ? 'Aucun produit à lancer' : `Lancer en arrière-plan (${n})`}
          disabled={n === 0}
          loading={launch.isPending}
          onPress={() => launch.mutate()}
        />
      }
    >
      <FlatList<HubPricingRow>
        data={rows}
        keyExtractor={(row) => row.reference}
        extraData={[excluded, estimateByRef]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={styles.hint}>
              La préparation IA tourne en arrière-plan. Les fiches prêtes sont publiées
              automatiquement, les autres restent dans « À traiter ». La note après est une
              estimation, pas une garantie.
            </Text>
            <View style={styles.cells}>
              <SummaryCell label="À lancer" value={String(n)} />
              <SummaryCell
                label="Note moyenne"
                value={summaryValue(
                  summary.averageBefore === null
                    ? '—'
                    : `${summary.averageBefore} → ${summary.averageAfter ?? '—'}`,
                )}
              />
              <SummaryCell
                label="Publication probable"
                value={summaryValue(String(summary.likelyPublishable))}
              />
              <SummaryCell
                label="Probablement bloquées"
                value={summaryValue(String(summary.likelyBlocked))}
                warning={summary.likelyBlocked > 0}
              />
            </View>
            {estimateQuery.isError ? (
              <View style={styles.warn}>
                <Text style={styles.warnText}>
                  Impossible d’estimer les notes. Vous pouvez tout de même lancer les fiches.
                </Text>
                <Button
                  label="Réessayer"
                  variant="outline"
                  onPress={() => void estimateQuery.refetch()}
                />
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const estimate = estimateByRef.get(item.reference);
          const isIncluded = !excluded.has(item.reference);
          const before = estimate?.currentScore ?? item.siteQuality?.score ?? null;
          const gain = estimate?.gain;
          return (
            <View style={[styles.row, !isIncluded && styles.rowOff]}>
              <View style={styles.rowText}>
                <Text style={styles.reference} numberOfLines={1}>
                  {item.reference}
                </Text>
                <Text style={styles.designation} numberOfLines={1}>
                  {[item.brand, item.designation].filter(Boolean).join(' · ') || '—'}
                </Text>
                <View style={styles.scoreLine}>
                  <Text style={styles.score}>{before ?? '—'}</Text>
                  <Text style={styles.arrow}>→</Text>
                  {loading ? (
                    <ActivityIndicator size="small" color={t.textMuted} />
                  ) : (
                    <Text style={styles.score}>{estimate?.estimatedScore ?? '—'}</Text>
                  )}
                  {gain != null ? (
                    <Text style={[styles.gain, gain < 0 && { color: t.danger }]}>
                      {gain > 0 ? `+${gain}` : String(gain)}
                    </Text>
                  ) : null}
                </View>
                {(estimate?.alerts ?? []).map((alert) => (
                  <Text
                    key={alert.code}
                    style={[
                      styles.alert,
                      alert.severity === 'blocker' && { color: t.danger },
                      alert.severity === 'warning' && { color: t.warning },
                    ]}
                  >
                    {alert.label}
                  </Text>
                ))}
              </View>
              <Switch
                accessibilityLabel={`Inclure ${item.reference} dans le lancement`}
                value={isIncluded}
                disabled={launch.isPending}
                onValueChange={(on) => toggleIncluded(item.reference, on)}
                trackColor={{ true: t.accent }}
              />
            </View>
          );
        }}
      />
    </SheetScreen>
  );
}

function Separator() {
  const styles = useStyles();
  return <View style={styles.separator} />;
}

function SummaryCell({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={[styles.cellValue, warning && { color: t.warning }]}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: spacing.xl, paddingBottom: spacing['2xl'] },
  headerWrap: { gap: spacing.lg, paddingBottom: spacing.lg },
  hint: { fontSize: fontSize.xs, color: t.textMuted, lineHeight: 17 },
  cells: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: {
    minWidth: '47%',
    flexGrow: 1,
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.surface,
  },
  cellLabel: { fontSize: 11, fontWeight: '700', color: t.textSubtle },
  cellValue: { fontSize: fontSize.base, fontWeight: '800', color: t.text },
  warn: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: withAlpha(t.warning, 0.12),
  },
  warnText: { fontSize: fontSize.xs, color: t.text, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowOff: { opacity: 0.4 },
  rowText: { flex: 1, gap: 2 },
  reference: {
    fontFamily: monoFontFamily,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: t.text,
  },
  designation: { fontSize: fontSize.xs, color: t.textMuted },
  scoreLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  score: { fontSize: fontSize.xs, fontWeight: '700', color: t.text },
  arrow: { fontSize: fontSize.xs, color: t.textFaint },
  gain: { fontSize: fontSize.xs, fontWeight: '800', color: t.success },
  alert: { fontSize: 11, color: t.textMuted, lineHeight: 15 },
  separator: { height: StyleSheet.hairlineWidth * 2, backgroundColor: t.border, marginVertical: spacing.md },
}));
