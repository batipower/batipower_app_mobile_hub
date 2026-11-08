import { Pressable, Text, View } from 'react-native';
import { ChevronRight, ListChecks, Loader } from 'lucide-react-native';

import { useAnalyzerState } from '@/features/product-analyzer/hooks/useSingleAnalysis';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { openPaLive, openPaQueue } from '../navigation';

/**
 * Bandeau « Analyse en cours » : tant qu'une analyse unitaire ou une file tourne (ou attend une
 * saisie), il permet de revenir à son suivi depuis l'historique.
 */
export function AnalysisBanner() {
  const styles = useStyles();
  const t = useTheme();
  const { single, queue } = useAnalyzerState();

  const queueActive = queue.open;
  const singleActive = single.phase !== 'idle';
  const needsInput = single.weight !== null;
  if (!queueActive && !singleActive) return null;

  let title: string;
  let detail: string;
  if (queueActive && !singleActive) {
    const processed = queue.items.filter((i) => i.status !== 'pending' && i.status !== 'analyzing').length;
    title = queue.running ? "File d'analyses en cours" : "File d'analyses terminée";
    detail = `${processed} / ${queue.items.length} produit${queue.items.length > 1 ? 's' : ''}`;
  } else {
    title = needsInput ? 'Le poids est attendu' : singleTitle(single.phase);
    detail = single.request?.label ?? 'Appuyez pour suivre l’analyse';
  }

  const Icon = queueActive && !singleActive ? ListChecks : Loader;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${detail}`}
      onPress={queueActive && !singleActive ? openPaQueue : openPaLive}
      style={({ pressed }) => [styles.banner, pressed && { opacity: 0.8 }]}
    >
      <View style={styles.icon}>
        <Icon size={18} color={t.accentText} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.detail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <ChevronRight size={18} color={t.accentText} />
    </Pressable>
  );
}

function singleTitle(phase: string): string {
  switch (phase) {
    case 'completing':
      return 'Analyse terminée · voir la fiche';
    case 'failed':
    case 'interrupted':
      return 'Analyse en échec · à relancer';
    case 'cancelled':
      return 'Analyse annulée';
    case 'blocked':
    case 'already_analyzed':
    case 'reused':
    case 'ebat_not_found':
      return 'Analyse : action requise';
    default:
      return 'Analyse en cours';
  }
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
    borderColor: withAlpha(t.accent, 0.4),
    backgroundColor: withAlpha(t.accent, 0.12),
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(t.accent, 0.18),
  },
  text: { flex: 1, gap: 1 },
  title: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  detail: { fontSize: fontSize.xs, color: t.textMuted },
}));
