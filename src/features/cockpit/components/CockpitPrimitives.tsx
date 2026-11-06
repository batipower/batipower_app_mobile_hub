import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Eye, EyeOff, TrendingDown, TrendingUp } from 'lucide-react-native';

import { Card } from '@/components/ui';
import { formatPercent, percentDelta } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, typography, useTheme, withAlpha } from '@/theme';

type Tone = 'default' | 'warning' | 'danger' | 'success';

function useToneColor() {
  const t = useTheme();
  return (tone: Tone) =>
    ({ default: t.text, warning: t.warning, danger: t.danger, success: t.success })[tone];
}

// ─── Panneau ─────────────────────────────────────────────────────────────────

type PanelProps = {
  title: string;
  /** Élément aligné à droite du titre (sélecteur, bascule, lien…). */
  trailing?: ReactNode;
  children: ReactNode;
};

/** Encadré titré du cockpit : petit titre en capitales + carte « verre ». */
export function Panel({ title, trailing, children }: PanelProps) {
  const styles = useStyles();
  return (
    <Card contentStyle={styles.panelContent}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle} accessibilityRole="header">
          {title}
        </Text>
        {trailing}
      </View>
      {children}
    </Card>
  );
}

/** Sous-titre d'un bloc à l'intérieur d'un panneau. */
export function SubTitle({ children }: { children: string }) {
  const styles = useStyles();
  return <Text style={styles.subTitle}>{children}</Text>;
}

// ─── Chiffres ────────────────────────────────────────────────────────────────

type StatTileProps = {
  label: string;
  value: string;
  /** Ligne secondaire (détail, comparaison). */
  hint?: string;
  tone?: Tone;
  /** Élément à droite du chiffre (variation…). */
  accessory?: ReactNode;
};

/** Tuile « libellé + chiffre » en creux dans un panneau. */
export function StatTile({ label, value, hint, tone = 'default', accessory }: StatTileProps) {
  const styles = useStyles();
  const toneColor = useToneColor();
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label} : ${value}`}>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.tileValueRow}>
        <Text
          style={[styles.tileValue, { color: toneColor(tone) }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
        {accessory}
      </View>
      {hint ? (
        <Text style={styles.tileHint} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** Grille de tuiles : deux par ligne. */
export function StatGrid({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.grid}>{children}</View>;
}

// ─── Variation ───────────────────────────────────────────────────────────────

type DeltaChipProps = {
  current: number;
  previous: number;
  /** Sens favorable : une hausse est « bonne » (CA) ou « mauvaise » (taux de retour). */
  goodWhen?: 'up' | 'down';
  /** Complément lu par VoiceOver (« par rapport au mois dernier »). */
  context?: string;
};

/** Pastille de variation en % entre deux valeurs ; rien si la comparaison est impossible. */
export function DeltaChip({ current, previous, goodWhen = 'up', context }: DeltaChipProps) {
  const styles = useStyles();
  const t = useTheme();
  const delta = percentDelta(current, previous);
  if (delta === null) return null;

  const flat = Math.abs(delta) < 0.5;
  const up = delta > 0;
  const good = flat ? null : up === (goodWhen === 'up');
  // `neutral` (hexadécimal) : `withAlpha` refuse les textes translucides comme `textSubtle`.
  const color = flat ? t.neutral : good ? t.success : t.danger;
  const Icon = up ? TrendingUp : TrendingDown;
  const text = `${up ? '+' : ''}${formatPercent(delta, 0)}`;

  return (
    <View
      style={[styles.delta, { backgroundColor: withAlpha(color, 0.14) }]}
      accessible
      accessibilityLabel={`${text}${context ? ` ${context}` : ''}`}
    >
      {flat ? null : <Icon size={11} color={color} />}
      <Text style={[styles.deltaText, { color }]}>{text}</Text>
    </View>
  );
}

// ─── Barres ──────────────────────────────────────────────────────────────────

type BarRowProps = {
  label: string;
  value: number;
  /** Valeur de la barre pleine (la plus grande de la série). */
  max: number;
  /** Texte à droite (par défaut la valeur). */
  display?: string;
  tone?: Tone;
};

/** Ligne « libellé, barre proportionnelle, valeur » pour les pipelines et les causes. */
export function BarRow({ label, value, max, display, tone = 'default' }: BarRowProps) {
  const styles = useStyles();
  const t = useTheme();
  const color =
    tone === 'default'
      ? t.accent
      : { warning: t.warning, danger: t.danger, success: t.success }[tone];
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const text = display ?? String(value);

  return (
    <View style={styles.barRow} accessible accessibilityLabel={`${label} : ${text}`}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.barValue}>{text}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ─── Bascule marge ───────────────────────────────────────────────────────────

type MarginToggleProps = {
  visible: boolean;
  onToggle: () => void;
};

/**
 * Bascule « Marge » : la marge est discrète par défaut (écran regardé par un tiers), comme
 * l'œil de la vue financière du web.
 */
export function MarginToggle({ visible, onToggle }: MarginToggleProps) {
  const styles = useStyles();
  const t = useTheme();
  const Icon = visible ? Eye : EyeOff;
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync().catch(() => undefined);
        onToggle();
      }}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: visible }}
      accessibilityLabel="Afficher la marge"
      style={({ pressed }) => [
        styles.toggle,
        visible && {
          backgroundColor: withAlpha(t.accent, 0.16),
          borderColor: withAlpha(t.accent, 0.4),
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Icon size={13} color={visible ? t.accentText : t.textSubtle} />
      <Text style={[styles.toggleText, visible && { color: t.accentText }]}>Marge</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  panelContent: { padding: spacing.lg, gap: spacing.lg },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 24,
  },
  panelTitle: { ...typography.label, flexShrink: 1, color: t.textSubtle },
  subTitle: { ...typography.label, color: t.textFaint },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexGrow: 1,
    flexBasis: '47%',
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.surface,
  },
  tileLabel: { fontSize: 11, fontWeight: '600', color: t.textSubtle },
  tileValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tileValue: { flexShrink: 1, fontSize: fontSize.xl, fontWeight: '800', color: t.text },
  tileHint: { fontSize: 11, color: t.textSubtle },

  delta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm - 2,
  },
  deltaText: { fontSize: 11, fontWeight: '700' },

  barRow: { gap: 5 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  barLabel: { flex: 1, fontSize: fontSize.xs, color: t.textMuted },
  barValue: { fontSize: fontSize.xs, fontWeight: '700', color: t.text },
  barTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: t.surfaceStrong,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: radius.full },

  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  toggleText: { fontSize: 11, fontWeight: '700', color: t.textSubtle },
}));
