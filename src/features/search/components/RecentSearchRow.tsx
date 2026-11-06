import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight, Package, Tag, Undo2, type LucideIcon } from 'lucide-react-native';

import { formatRelative } from '@/lib/format';
import {
  fontSize,
  hitTarget,
  makeStyles,
  monoFontFamily,
  radius,
  spacing,
  useTheme,
} from '@/theme';
import type { HubSearchHistoryEntry, HubSearchHistoryType } from '@/types/searchHistory';

const ICONS: Record<HubSearchHistoryType, LucideIcon> = {
  ORDER: Package,
  RETURN: Undo2,
  PRODUCT: Tag,
  ANALYZER: Tag,
};

const TYPE_LABELS: Record<HubSearchHistoryType, string> = {
  ORDER: 'Commande',
  RETURN: 'Retour',
  PRODUCT: 'Produit',
  ANALYZER: 'Analyse',
};

type RecentSearchRowProps = {
  entry: HubSearchHistoryEntry;
  onPress: (entry: HubSearchHistoryEntry) => void;
};

/** Une recherche récente : type, référence, sous-titre (client, désignation) et ancienneté. */
function RecentSearchRowBase({ entry, onPress }: RecentSearchRowProps) {
  const styles = useStyles();
  const t = useTheme();
  const Icon = ICONS[entry.type];
  const when = formatRelative(entry.createdAt);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[TYPE_LABELS[entry.type], entry.label, entry.subtitle, when]
        .filter(Boolean)
        .join(', ')}
      onPress={() => onPress(entry)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Icon size={16} color={t.textMuted} />
      </View>
      <View style={styles.text}>
        <Text style={styles.label} numberOfLines={1}>
          {entry.label}
        </Text>
        {entry.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {entry.subtitle}
          </Text>
        ) : null}
      </View>
      {when ? <Text style={styles.when}>{when}</Text> : null}
      <ChevronRight size={16} color={t.textFaint} />
    </Pressable>
  );
}

export const RecentSearchRow = memo(RecentSearchRowBase);

const useStyles = makeStyles((t) => ({
  row: {
    minHeight: hitTarget + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  pressed: { backgroundColor: t.surfaceStrong },
  icon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.surface,
  },
  text: { flex: 1, gap: 1 },
  label: {
    fontFamily: monoFontFamily,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: t.text,
  },
  subtitle: { fontSize: fontSize.xs, color: t.textMuted },
  when: { fontSize: fontSize.xs, color: t.textSubtle },
}));
