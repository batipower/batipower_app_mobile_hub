import { Text, View } from 'react-native';
import { Image } from 'expo-image';

import { env } from '@/config/env';
import { fontSize, makeStyles, radius } from '@/theme';
import type { PartnerLogo } from '@/types/admin';

type DistributorLogoProps = {
  logo: Pick<PartnerLogo, 'logoUrl' | 'logoNeedsLightBackground'> | null | undefined;
  label: string;
  size?: number;
};

/** URL absolue d'un logo (servi par l'API sans authentification, comme dans les e-mails). */
export function partnerLogoUri(logo: Pick<PartnerLogo, 'logoUrl'> | null | undefined): string | null {
  return logo?.logoUrl ? `${env.apiBaseUrl}/${logo.logoUrl.replace(/^\/+/, '')}` : null;
}

/**
 * Pastille de logo d'un distributeur ou d'une filiale. Les logos à éléments blancs reçoivent un fond
 * sombre pour rester lisibles ; sans logo, l'initiale du nom.
 */
export function DistributorLogo({ logo, label, size = 36 }: DistributorLogoProps) {
  const styles = useStyles();
  const uri = partnerLogoUri(logo);
  const dark = logo?.logoNeedsLightBackground === true;
  return (
    <View
      style={[styles.tile, { width: size, height: size }, dark && styles.dark]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Logo ${label}`}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size * 0.82, height: size * 0.82 }}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{label.charAt(0).toUpperCase()}</Text>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    overflow: 'hidden',
  },
  dark: { backgroundColor: '#131921' },
  initial: { fontWeight: '800', color: t.textMuted, fontSize: fontSize.base },
}));
