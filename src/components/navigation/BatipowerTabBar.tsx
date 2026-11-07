import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSegments } from 'expo-router';
import { TabTrigger } from 'expo-router/ui';
import type { LucideIcon } from 'lucide-react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, withAlpha } from '@/theme';

import { CENTER_BUTTON_SIZE, CenterBoltButton } from './CenterBoltButton';
import { TabBarButton } from './TabBarButton';
import { setTabBarInset } from './tabBarInset';

/** Un onglet de la barre : `name` est celui du `TabTrigger` déclaré dans le layout. */
export type TabBarItem = {
  name: string;
  label: string;
  Icon: LucideIcon;
  /** Pastille (ex. non-lus) ; absente ou vide : aucune pastille. */
  badge?: string | null;
};

type BatipowerTabBarProps = {
  items: readonly TabBarItem[];
  /** Appui sur le bouton central (éclair). */
  onCenterPress: () => void;
  centerLabel: string;
};

const BAR_HEIGHT = 66;
/** Débord du bouton central au-dessus de la capsule. */
const PROTRUDE = 20;
const SIDE_MARGIN = 14;
const PADDING = 8;
/** Largeur réservée au bouton central entre les deux groupes d'onglets. */
const CENTER_SLOT = 80;
/** Espace laissé entre le haut de la barre et le contenu au-dessus. */
const BREATHING = 10;

/** Écrans qui, dans l'onglet Cockpit, sont des vues sœurs (sans bouton retour) du tableau de bord. */
const COCKPIT_ROOT_VIEWS = new Set(['site', 'partner', 'financier']);

/**
 * Lit la route courante : onglet actif et barre visible ou non. La barre n'est affichée que sur
 * l'écran racine de chaque onglet (et sous la feuille de menu qu'elle ouvre) ; sur les écrans
 * poussés (fil de discussion, scan, fiches…), elle glisse hors de l'écran pour ne jamais masquer
 * un composeur ou une action du bas.
 */
function useTabBarRoute() {
  const segments = useSegments() as string[];
  const tabsIndex = segments.indexOf('(tabs)');

  if (tabsIndex === -1) {
    return { active: null, visible: segments.includes('menu') };
  }

  const sub = segments.slice(tabsIndex + 1);
  const active = sub[0] ?? null;
  const isRoot =
    sub.length <= 1 ||
    sub[1] === 'index' ||
    (active === 'cockpit' && sub.length === 2 && COCKPIT_ROOT_VIEWS.has(sub[1] ?? ''));
  return { active, visible: isRoot };
}

/**
 * Barre d'onglets flottante de Batipower : capsule en verre posée au-dessus de la safe area, avec
 * un fond actif qui glisse sous l'onglet sélectionné et, au centre, le bouton éclair surélevé.
 * Les onglets se répartissent de part et d'autre du bouton central.
 */
export function BatipowerTabBar({ items, onCenterPress, centerLabel }: BatipowerTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const route = useTabBarRoute();

  // Pendant la feuille de menu l'onglet courant n'est pas lisible dans la route : on garde le dernier.
  const [lastActive, setLastActive] = useState<string | null>(null);
  if (route.active && route.active !== lastActive) setLastActive(route.active);
  const active = route.active ?? lastActive;

  const bottomOffset = Math.max(insets.bottom - 6, 10);
  const wrapperHeight = BAR_HEIGHT + PROTRUDE;
  const occupied = bottomOffset + wrapperHeight + BREATHING;
  const hideDistance = wrapperHeight + bottomOffset + 24;

  const { visible } = route;
  useEffect(() => {
    setTabBarInset(visible ? occupied : 0);
  }, [visible, occupied]);
  useEffect(() => () => setTabBarInset(0), []);

  const barWidth = windowWidth - SIDE_MARGIN * 2;
  const leftCount = Math.ceil(items.length / 2);
  const itemWidth = (barWidth - PADDING * 2 - CENTER_SLOT) / Math.max(items.length, 1);
  const positionOf = (index: number) =>
    PADDING + index * itemWidth + (index >= leftCount ? CENTER_SLOT : 0);

  const activeIndex = items.findIndex((item) => item.name === active);
  const indicatorX = useMemo(
    () => (activeIndex >= 0 ? positionOf(activeIndex) : 0),
    // `positionOf` ne dépend que de ces valeurs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeIndex, itemWidth, leftCount],
  );

  const slide = useSharedValue(visible ? 0 : 1);
  useEffect(() => {
    slide.set(
      withTiming(visible ? 0 : 1, {
        duration: visible ? 320 : 220,
        easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      }),
    );
  }, [visible, slide]);
  const wrapperStyle = useAnimatedStyle(() => ({
    opacity: 1 - slide.value,
    transform: [{ translateY: slide.value * hideDistance }],
  }));

  const x = useSharedValue(indicatorX);
  const indicatorOpacity = useSharedValue(activeIndex >= 0 ? 1 : 0);
  useEffect(() => {
    x.set(withSpring(indicatorX, { damping: 17, stiffness: 190, mass: 0.9 }));
    indicatorOpacity.set(withTiming(activeIndex >= 0 ? 1 : 0, { duration: 150 }));
  }, [indicatorX, activeIndex, x, indicatorOpacity]);
  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorOpacity.value,
    transform: [{ translateX: x.value }],
  }));

  const renderItem = (item: TabBarItem) => (
    <View key={item.name} style={{ width: itemWidth, height: BAR_HEIGHT }}>
      <TabTrigger name={item.name} asChild>
        <TabBarButton
          label={item.label}
          Icon={item.Icon}
          badge={item.badge}
          focused={item.name === active}
        />
      </TabTrigger>
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          left: SIDE_MARGIN,
          right: SIDE_MARGIN,
          bottom: bottomOffset,
          height: wrapperHeight,
          pointerEvents: visible ? 'box-none' : 'none',
        },
        wrapperStyle,
      ]}
    >
      <View
        style={[
          styles.capsule,
          { backgroundColor: t.bgElevated, borderColor: t.borderStrong, shadowColor: '#000000' },
        ]}
      >
        <View style={styles.clip}>
          <BlurView intensity={55} tint={t.blurTint} style={StyleSheet.absoluteFill} />
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(t.bgElevated, 0.78) }]}
          />
        </View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              left: 3,
              width: itemWidth - 6,
              backgroundColor: withAlpha(t.accent, t.scheme === 'dark' ? 0.16 : 0.2),
              borderColor: withAlpha(t.accent, 0.35),
            },
            indicatorStyle,
          ]}
        />

        <View style={styles.row}>
          {items.slice(0, leftCount).map(renderItem)}
          <View style={{ width: CENTER_SLOT }} />
          {items.slice(leftCount).map(renderItem)}
        </View>
      </View>

      <View
        style={[
          styles.center,
          { left: PADDING + leftCount * itemWidth + (CENTER_SLOT - CENTER_BUTTON_SIZE) / 2 },
        ]}
      >
        <CenterBoltButton onPress={onCenterPress} accessibilityLabel={centerLabel} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute' },
  capsule: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth * 2,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  clip: {
    ...StyleSheet.absoluteFill,
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 8,
    height: BAR_HEIGHT - 16,
    borderRadius: (BAR_HEIGHT - 16) / 2,
    borderWidth: 1,
  },
  row: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PADDING,
  },
  center: { position: 'absolute', top: 0 },
});
