import { useState, type ReactNode } from 'react';
import { LayoutAnimation, Pressable, Text, View } from 'react-native';
import { ChevronDown, Pencil } from 'lucide-react-native';

import { fontSize, makeStyles, monoFontFamily, radius, spacing, useTheme } from '@/theme';

type FicheSectionProps = {
  title: string;
  subtitle?: string;
  /** Pastille de couleur devant le titre (repère visuel de la famille de données). */
  dot?: string;
  /** Élément à droite de l'en-tête (badge, résumé). */
  right?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
};

/** Section repliable de la fiche : l'en-tête reste visible, le détail se déplie au toucher. */
export function FicheSection({ title, subtitle, dot, right, defaultOpen = true, children }: FicheSectionProps) {
  const styles = useStyles();
  const t = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}`}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((v) => !v);
        }}
        style={({ pressed }) => [styles.header, pressed && { backgroundColor: t.cardPressed }]}
      >
        {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
        <View style={styles.titles}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={open ? 2 : 1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
        <ChevronDown
          size={18}
          color={t.textSubtle}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

type FactProps = {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
  accent?: boolean;
  tone?: string;
  tag?: string;
  /** Pleine largeur (valeur longue). */
  wide?: boolean;
  onEdit?: () => void;
  editLabel?: string;
  right?: ReactNode;
};

/** Couple libellé / valeur d'une grille de faits ; crayon d'édition optionnel. */
export function Fact({ label, value, mono, accent, tone, tag, wide, onEdit, editLabel, right }: FactProps) {
  const styles = useStyles();
  const t = useTheme();
  const empty = value == null || value === '' || value === '-';
  return (
    <View style={[styles.fact, wide && styles.factWide]}>
      <Text style={styles.factLabel}>
        {label}
        {tag ? <Text style={styles.factTag}> {tag}</Text> : null}
      </Text>
      <View style={styles.factRow}>
        <Text
          selectable
          style={[
            styles.factValue,
            mono && { fontFamily: monoFontFamily },
            accent && { color: t.accentText },
            tone ? { color: tone } : null,
            empty && { color: t.textFaint },
          ]}
          numberOfLines={wide ? 3 : 1}
        >
          {empty ? '—' : String(value)}
        </Text>
        {right}
        {onEdit ? (
          <Pressable
            onPress={onEdit}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={editLabel ?? `Modifier ${label}`}
            style={styles.edit}
          >
            <Pencil size={13} color={t.accentText} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function FactGrid({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.grid}>{children}</View>;
}

/** Message d'état d'une section (aucune donnée, chargement…). */
export function SectionHint({ text }: { text: string }) {
  const styles = useStyles();
  return <Text style={styles.hint}>{text}</Text>;
}

const useStyles = makeStyles((t) => ({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  titles: { flex: 1, gap: 1 },
  title: { fontSize: fontSize.sm, fontWeight: '800', color: t.text },
  subtitle: { fontSize: 11, color: t.textMuted },
  body: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: t.border,
    paddingTop: spacing.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md, columnGap: spacing.md },
  fact: { width: '47%', flexGrow: 1, gap: 2 },
  factWide: { width: '100%' },
  factLabel: { fontSize: 10, fontWeight: '700', color: t.textSubtle, textTransform: 'uppercase' },
  factTag: { fontWeight: '500', color: t.textFaint },
  factRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  factValue: { flexShrink: 1, fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  edit: { padding: 2 },
  hint: { fontSize: fontSize.xs, color: t.textMuted },
}));
