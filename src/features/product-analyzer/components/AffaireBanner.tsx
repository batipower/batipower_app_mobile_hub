import { Pressable, Text, View } from 'react-native';
import { ChevronRight, Layers } from 'lucide-react-native';

import { formatInteger, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { usePaFilters } from '../filtersStore';
import { useAffaireStats, useAffaires } from '../hooks/useStagingList';
import { openPaAffaire } from '../navigation';

/** Bandeau de l'affaire filtrée : nom, fournisseur, chiffres clés et accès à sa fiche. */
export function AffaireBanner() {
  const styles = useStyles();
  const t = useTheme();
  const f = usePaFilters();
  const active = f.affaire && !!f.affaireId;
  const { data: affaires } = useAffaires(active);
  const { data: stats } = useAffaireStats(active ? f.affaireId : null);
  if (!active) return null;

  const affaire = affaires?.find((a) => a.uuid === f.affaireId);
  const viable = stats?.byViability?.VIABLE ?? 0;
  const negotiable = stats?.byViability?.NEGOTIABLE ?? 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Affaire ${affaire?.name ?? ''}, ouvrir la fiche`}
      onPress={() => openPaAffaire(f.affaireId)}
      style={({ pressed }) => [styles.banner, pressed && { opacity: 0.8 }]}
    >
      <Layers size={18} color={t.info} />
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {affaire?.name ?? 'Affaire'}
          {affaire?.distributorName ? ` · ${affaire.distributorName}` : ''}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {stats
            ? `${formatInteger(stats.total)} produits · ${formatInteger(viable)} viables · ${formatInteger(negotiable)} à négocier · marge moy. ${formatPercent(stats.avgMarginPercent)}`
            : 'Chargement des chiffres…'}
        </Text>
      </View>
      <ChevronRight size={18} color={t.info} />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  banner: {
    marginHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(t.info, 0.4),
    backgroundColor: withAlpha(t.info, 0.1),
  },
  text: { flex: 1, gap: 1 },
  title: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  detail: { fontSize: fontSize.xs, color: t.textMuted },
}));
