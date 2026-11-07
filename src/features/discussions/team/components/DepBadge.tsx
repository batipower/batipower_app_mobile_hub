import { Text, View } from 'react-native';

import { makeStyles, radius, spacing, withAlpha } from '@/theme';

/** Brun « DEP » du web (`#B45309`), lisible sur fond clair comme sur fond sombre une fois teinté. */
const DEP_COLOR = '#B45309';

type DepBadgeProps = {
  /** Entrepôt DEP, affiché à la suite du libellé quand il est connu. */
  depWarehouse?: string | null;
};

/** Repère « DEP » des opportunités partagées en discussion (équivalent de `DepBadge` du web). */
export function DepBadge({ depWarehouse }: DepBadgeProps) {
  const styles = useStyles();
  const label = depWarehouse ? `DEP ${depWarehouse}` : 'DEP';
  return (
    <View
      style={styles.badge}
      accessibilityLabel={depWarehouse ? `Opportunité DEP, ${depWarehouse}` : 'Opportunité DEP'}
    >
      <Text style={styles.text} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm - 2,
    paddingVertical: 1,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: withAlpha(DEP_COLOR, 0.35),
    backgroundColor: withAlpha(DEP_COLOR, 0.12),
  },
  // Sur fond sombre, le brun pur manque de contraste : on prend l'ambre du thème.
  text: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: t.scheme === 'dark' ? t.warning : DEP_COLOR,
  },
}));
