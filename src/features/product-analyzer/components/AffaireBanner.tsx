import { Pressable, Text, View } from 'react-native';
import { ChevronRight, Layers, X } from 'lucide-react-native';

import { formatEuro, formatInteger, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { patchPaFilters, usePaFilters } from '../filtersStore';
import { useAffaireStats, useAffaires } from '../hooks/useStagingList';
import { VIAB_STATUS_CFG } from '../lib/constants';
import { openPaAffaire } from '../navigation';

/** Même code couleur que le web : 7 % et plus vert, 3 % et plus orange, sinon rouge. */
function marginColor(margin: number, t: { success: string; warning: string; danger: string }) {
  if (margin >= 7) return t.success;
  if (margin >= 3) return t.warning;
  return t.danger;
}

/** Bandeau de l'affaire filtrée : nom, fournisseur, chiffres clés, accès à sa fiche et sortie de l'affaire. */
export function AffaireBanner() {
  const styles = useStyles();
  const t = useTheme();
  const f = usePaFilters();
  const active = f.affaire && !!f.affaireId;
  const { data: affaires } = useAffaires(active);
  const { data: stats } = useAffaireStats(active ? f.affaireId : null);
  if (!active) return null;

  const affaire = affaires?.find((a) => a.uuid === f.affaireId);
  const loaded = stats && stats.affaireId === f.affaireId ? stats : null;
  const counts = [
    { key: 'VIABLE', n: loaded?.byViability?.VIABLE ?? 0, label: 'viables' },
    { key: 'NEGOTIABLE', n: loaded?.byViability?.NEGOTIABLE ?? 0, label: 'à négocier' },
    { key: 'NOT_VIABLE', n: loaded?.byViability?.NOT_VIABLE ?? 0, label: 'non viables' },
  ] as const;

  return (
    <View style={styles.banner}>
      <View style={styles.head}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Affaire ${affaire?.name ?? ''}, ouvrir la fiche`}
          onPress={() => openPaAffaire(f.affaireId)}
          style={({ pressed }) => [styles.headMain, pressed && { opacity: 0.8 }]}
        >
          <Layers size={18} color={t.info} />
          <View style={styles.flex}>
            <Text style={styles.title} numberOfLines={1}>
              {affaire?.name ?? loaded?.name ?? 'Affaire sélectionnée'}
            </Text>
            <Text style={styles.detail} numberOfLines={1}>
              {affaire?.distributorName ? `Fournisseur ${affaire.distributorName}` : 'Fournisseur à choisir'}
              {loaded ? ` · ${formatInteger(loaded.total)} produits` : ''}
            </Text>
          </View>
          <ChevronRight size={16} color={t.info} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quitter l'affaire"
          hitSlop={8}
          onPress={() => patchPaFilters({ affaire: false, affaireId: '' })}
          style={styles.quit}
        >
          <X size={16} color={t.info} />
          <Text style={styles.quitText}>Quitter</Text>
        </Pressable>
      </View>

      {loaded ? (
        <View style={styles.stats}>
          {loaded.avgMarginPercent != null ? (
            <Text style={styles.detail}>
              Marge moy.{' '}
              <Text style={[styles.strong, { color: marginColor(loaded.avgMarginPercent, t) }]}>
                {formatPercent(loaded.avgMarginPercent)}
              </Text>
            </Text>
          ) : null}
          {loaded.totalMonthlyPotentialFR > 0 ? (
            <Text style={styles.detail}>
              Potentiel FR <Text style={[styles.strong, { color: t.info }]}>{formatEuro(loaded.totalMonthlyPotentialFR)}</Text>
            </Text>
          ) : null}
          {counts.map((c) =>
            c.n > 0 ? (
              <View
                key={c.key}
                style={[
                  styles.tag,
                  {
                    backgroundColor: withAlpha(VIAB_STATUS_CFG[c.key].color, 0.14),
                    borderColor: withAlpha(VIAB_STATUS_CFG[c.key].color, 0.4),
                  },
                ]}
              >
                <Text style={[styles.tagText, { color: VIAB_STATUS_CFG[c.key].color }]}>
                  {formatInteger(c.n)} {c.label}
                </Text>
              </View>
            ) : null,
          )}
        </View>
      ) : (
        <Text style={styles.detail}>Chargement des chiffres…</Text>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  banner: {
    marginHorizontal: spacing.xl,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(t.info, 0.4),
    backgroundColor: withAlpha(t.info, 0.1),
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: 1 },
  title: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  detail: { fontSize: fontSize.xs, color: t.textMuted },
  strong: { fontWeight: '800' },
  quit: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  quitText: { fontSize: fontSize.xs, fontWeight: '700', color: t.info },
  stats: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  tag: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full, borderWidth: 1 },
  tagText: { fontSize: 10, fontWeight: '700' },
}));
