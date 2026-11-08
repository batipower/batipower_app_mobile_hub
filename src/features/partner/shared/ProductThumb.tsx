import { View } from 'react-native';
import { Image } from 'expo-image';
import { Package } from 'lucide-react-native';

import { radius, useTheme } from '@/theme';

/** Une miniature du back est un JPEG en base64, avec ou sans le préfixe `data:`. */
export function thumbSource(base64: string | null | undefined): string | null {
  if (!base64) return null;
  return base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
}

type ProductThumbProps = {
  base64: string | null | undefined;
  size?: number;
};

/** Miniature produit carrée, avec une icône à la place quand le produit n'a pas d'image. */
export function ProductThumb({ base64, size = 56 }: ProductThumbProps) {
  const t = useTheme();
  const uri = thumbSource(base64);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.surface,
      }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Package size={size * 0.4} color={t.textFaint} />
      )}
    </View>
  );
}
