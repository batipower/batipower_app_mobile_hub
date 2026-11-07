import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Copy, type LucideIcon } from 'lucide-react-native';

import { copyToClipboard } from '@/lib/clipboard';
import {
  fontSize,
  makeStyles,
  monoFontFamily,
  radius,
  spacing,
  typography,
  useTheme,
} from '@/theme';

import { Card } from './Card';

/** Les lignes sont plus basses que 44 pt : la zone tactile déborde pour atteindre la cible recommandée. */
const ROW_HIT_SLOP = { top: 12, bottom: 12 } as const;

type DetailSectionProps = {
  title: string;
  /** Élément aligné à droite du titre (compteur, lien…). */
  trailing?: ReactNode;
  children: ReactNode;
};

/** Bloc titré d'une fiche (commande, produit) : petit titre en capitales + carte plate. */
export function DetailSection({ title, trailing, children }: DetailSectionProps) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
        {trailing}
      </View>
      <Card contentStyle={styles.cardContent}>{children}</Card>
    </View>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
  /** Valeur en police à chasse fixe (références, n° de suivi, EAN). */
  mono?: boolean;
  /** Nom de la valeur dans le toast (« N° de suivi ») : active la copie (appui long ou icône). */
  copyLabel?: string;
  /** Action au toucher (appeler, écrire, ouvrir le suivi…) ; sans elle, le toucher copie. */
  onPress?: () => void;
  /** Icône d'action à droite quand `onPress` est fourni (téléphone, lien externe…). */
  icon?: LucideIcon;
  /** Indice VoiceOver décrivant l'action (« Appeler », « Ouvrir le suivi »). */
  actionHint?: string;
};

/** Ligne « libellé : valeur », éventuellement copiable ou cliquable. */
export function InfoRow({
  label,
  value,
  mono = false,
  copyLabel,
  onPress,
  icon: ActionIcon = ChevronRight,
  actionHint,
}: InfoRowProps) {
  const styles = useStyles();
  const t = useTheme();
  const copy = copyLabel ? () => void copyToClipboard(value, copyLabel) : undefined;
  const press = onPress ?? copy;

  const content = (
    <>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoValueWrap}>
        <Text style={[styles.infoValue, mono && styles.mono]} selectable={!press}>
          {value}
        </Text>
        {press ? (
          onPress ? (
            <ActionIcon size={14} color={t.accentText} />
          ) : (
            <Copy size={13} color={t.textSubtle} />
          )
        ) : null}
      </View>
    </>
  );

  if (!press) return <View style={styles.infoRow}>{content}</View>;

  return (
    <Pressable
      style={({ pressed }) => [styles.infoRow, styles.pressable, pressed && styles.pressed]}
      onPress={press}
      onLongPress={copy}
      hitSlop={ROW_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${value}`}
      accessibilityHint={
        onPress
          ? [actionHint, copy ? 'Appui long pour copier' : null].filter(Boolean).join('. ')
          : 'Appuyer pour copier'
      }
    >
      {content}
    </Pressable>
  );
}

/** Séparateur fin entre deux groupes de lignes à l'intérieur d'une carte. */
export function Divider() {
  const styles = useStyles();
  return <View style={styles.divider} />;
}

const useStyles = makeStyles((t) => ({
  section: { gap: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: { ...typography.label, color: t.textSubtle },
  cardContent: { padding: spacing.lg, gap: spacing.md },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  pressable: {
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  pressed: { backgroundColor: t.surface },
  infoLabel: { fontSize: fontSize.sm, color: t.textMuted },
  infoValueWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  infoValue: {
    flexShrink: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: t.text,
    textAlign: 'right',
  },
  mono: { fontFamily: monoFontFamily },
  divider: {
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: t.border,
  },
}));
