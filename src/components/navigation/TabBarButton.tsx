import type { ComponentRef, Ref } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { TabTriggerSlotProps } from 'expo-router/ui';
import type { LucideIcon } from 'lucide-react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/theme';

type TabBarButtonProps = Omit<TabTriggerSlotProps, 'children' | 'ref'> & {
  label: string;
  Icon: LucideIcon;
  /** Onglet affiché (calculé par la barre à partir de la route, pas par le déclencheur). */
  focused: boolean;
  /** Nombre affiché en pastille (0 ou absent : aucune pastille). */
  badge?: string | null;
  ref?: Ref<ComponentRef<typeof Pressable>>;
};

/**
 * Bouton d'un onglet de la barre flottante. Enveloppé dans un `TabTrigger asChild` : le
 * déclencheur fournit `onPress` (changement d'onglet) que ce bouton transmet au `Pressable`.
 */
export function TabBarButton({
  label,
  Icon,
  focused,
  badge,
  ref,
  onPress,
  onLongPress,
  // Props injectées par `TabTrigger` mais sans objet ici : le style par défaut du déclencheur
  // (ligne, espacement) ne convient pas à un bouton icône + libellé.
  style: _style,
  isFocused: _isFocused,
  href: _href,
  ...rest
}: TabBarButtonProps) {
  const styles = useStyles();
  const t = useTheme();

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(focused ? 1.12 : 1, { damping: 14, stiffness: 220 }) },
      { translateY: withSpring(focused ? -1 : 0, { damping: 14, stiffness: 220 }) },
    ],
  }));

  const color = focused ? t.accentText : t.textSubtle;

  return (
    <Pressable
      {...rest}
      ref={ref}
      accessibilityRole="tab"
      accessibilityLabel={badge ? `${label}, ${badge} non lus` : label}
      accessibilityState={{ selected: focused }}
      onPress={(event) => {
        if (!focused) void Haptics.selectionAsync().catch(() => undefined);
        onPress?.(event);
      }}
      onLongPress={onLongPress}
      style={styles.button}
    >
      <Animated.View style={iconStyle}>
        <Icon size={22} color={color} strokeWidth={focused ? 2.3 : 1.9} />
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </Animated.View>
      <Text numberOfLines={1} style={[styles.label, { color }, focused && styles.labelFocused]}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.1 },
  labelFocused: { fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.danger,
    borderWidth: 1.5,
    borderColor: t.bgElevated,
  },
  badgeText: { fontSize: 9.5, fontWeight: '800', color: '#FFFFFF' },
}));
