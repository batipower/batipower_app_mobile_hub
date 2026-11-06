import { Text, View } from 'react-native';
import { Image } from 'expo-image';

import { makeStyles, radius } from '@/theme';

import { originLabel, originLogo } from '../orderDisplay';

type OriginLogoProps = {
  origin: string | null | undefined;
  /** Côté de la pastille, en points. */
  size?: number;
};

/**
 * Logo de l'origine d'une commande (site, Amazon, ManoMano…) sur une pastille blanche, pour
 * être lisible en thème sombre. Sans logo connu : initiale de l'origine.
 */
export function OriginLogo({ origin, size = 22 }: OriginLogoProps) {
  const styles = useStyles();
  const source = originLogo(origin);
  const label = originLabel(origin);
  const box = { width: size, height: size, borderRadius: Math.min(radius.sm, size / 3) };

  return (
    <View style={[styles.tile, box]} accessible accessibilityLabel={label} accessibilityRole="image">
      {source !== null ? (
        <Image
          source={source}
          style={{ width: size * 0.78, height: size * 0.78 }}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text style={[styles.initial, { fontSize: size * 0.5 }]}>
          {label.charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: t.border,
  },
  initial: { fontWeight: '800', color: '#4A5560' },
}));
