import { Text, View } from 'react-native';

import { fontSize, makeStyles, radius, useTheme, withAlpha } from '@/theme';

type LiveProgressBarProps = {
  /** Éléments terminés (vert). */
  done: number;
  /** Éléments en cours (bleu), à la suite des terminés. */
  active?: number;
  /** Total de la barre ; par défaut `done + active`. */
  total?: number;
  height?: number;
  /** Couleur du segment « terminé » (ambre quand le poste est en pause). */
  doneColor?: string;
};

const pct = (n: number, total: number) =>
  total > 0 ? Math.min(100, Math.max(0, (n / total) * 100)) : 0;

/** Barre de progression à segments : terminés (vert), en cours (bleu), reste à faire (gris). */
export function LiveProgressBar({
  done,
  active = 0,
  total,
  height = 8,
  doneColor,
}: LiveProgressBarProps) {
  const styles = useStyles();
  const t = useTheme();
  const denominator = total ?? done + active;
  const donePct = pct(done, denominator);
  const activePct = Math.min(100 - donePct, pct(active, denominator));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: denominator, now: done }}
      style={[styles.track, { height }]}
    >
      <View style={{ width: `${donePct}%`, backgroundColor: doneColor ?? t.success }} />
      <View style={{ width: `${activePct}%`, backgroundColor: t.info }} />
    </View>
  );
}

/** « 280 / 3299 · 8 % » : fraction et pourcentage d'une barre. */
export function progressText(done: number, total: number): string {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return `${done} / ${total} · ${percent} %`;
}

export function ProgressLabel({ done, total }: { done: number; total: number }) {
  const styles = useStyles();
  return <Text style={styles.text}>{progressText(done, total)}</Text>;
}

const useStyles = makeStyles((t) => ({
  track: {
    flexDirection: 'row',
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.full,
    backgroundColor: withAlpha(t.neutral, 0.2),
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: t.text,
    fontVariant: ['tabular-nums'],
  },
}));
