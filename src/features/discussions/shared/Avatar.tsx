import { Text, View } from 'react-native';

import { makeStyles } from '@/theme';

import { colorFromString, initials } from './format';

type AvatarProps = {
  name: string | null | undefined;
  size?: number;
};

/** Avatar à initiales, de couleur stable pour un même nom. */
export function Avatar({ name, size = 36 }: AvatarProps) {
  const styles = useStyles();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.root,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colorFromString(name ?? ''),
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: Math.round(size * 0.38) }]}>{initials(name)}</Text>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  root: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#FFFFFF', fontWeight: '700' },
}));
