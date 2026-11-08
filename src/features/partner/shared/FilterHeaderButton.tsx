import { Pressable, Text, View } from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';

import { hitTarget, makeStyles, radius, useTheme } from '@/theme';

type FilterHeaderButtonProps = {
  /** Nombre de filtres actifs, affiché en pastille. */
  count: number;
  onPress: () => void;
};

/** Bouton « Filtres » de l'en-tête d'une liste, avec la pastille du nombre de filtres actifs. */
export function FilterHeaderButton({ count, onPress }: FilterHeaderButtonProps) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Filtres${count > 0 ? `, ${count} actif${count > 1 ? 's' : ''}` : ''}`}
      hitSlop={6}
      onPress={onPress}
      style={styles.button}
    >
      <SlidersHorizontal size={20} color={t.accentText} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  button: {
    width: hitTarget - 4,
    height: hitTarget - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.accent,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: t.onAccent },
}));
