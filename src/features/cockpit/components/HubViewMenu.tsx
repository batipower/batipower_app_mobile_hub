import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check, ChevronDown } from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

import { useAuth } from '@/auth/AuthProvider';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { hubViewMeta, hubViewsFor, openHubView, type HubView } from '../hubViews';

type HubViewMenuProps = {
  /** Vue affichée par l'écran courant : c'est son nom qui sert de titre. */
  current: HubView;
};

/**
 * Titre de l'accueil HUB, déroulant : le nom de la vue (« Cockpit », « Site »…) suivi d'un
 * chevron ; un appui déplie sous lui la liste des autres vues, comme les onglets du web.
 * Rien n'est affiché si le compte n'a pas d'autre vue à ouvrir.
 */
export function HubViewMenu({ current }: HubViewMenuProps) {
  const styles = useStyles();
  const t = useTheme();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const rotation = useDerivedValue(() => withTiming(open ? 180 : 0, { duration: 200 }), [open]);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const title = hubViewMeta(current).label;
  const views = user ? hubViewsFor(user.role) : [];
  const expandable = views.length > 1;

  if (!expandable) {
    return (
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
    );
  }

  const toggle = () => {
    void Haptics.selectionAsync().catch(() => undefined);
    setOpen((value) => !value);
  };

  const choose = (view: HubView) => {
    setOpen(false);
    if (view === current) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    openHubView(view);
  };

  return (
    <Animated.View layout={LinearTransition.duration(200)} style={styles.wrap}>
      <Pressable
        onPress={toggle}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`${title}. Changer de tableau de bord`}
        accessibilityHint={open ? 'Referme la liste' : 'Affiche Site, Stats PARTNER et Financier'}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Animated.View style={[styles.chevron, chevronStyle]}>
          <ChevronDown size={20} color={t.accentText} />
        </Animated.View>
      </Pressable>

      {open ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          style={styles.panel}
        >
          {views.map((view) => {
            const { label, Icon } = hubViewMeta(view);
            const active = view === current;
            return (
              <Pressable
                key={view}
                onPress={() => choose(view)}
                accessibilityRole="menuitem"
                accessibilityLabel={label}
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.row,
                  active && styles.rowActive,
                  pressed && styles.pressed,
                ]}
              >
                <Icon size={18} color={active ? t.accentText : t.textMuted} />
                <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>{label}</Text>
                {active ? <Check size={16} color={t.accentText} /> : null}
              </Pressable>
            );
          })}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { alignSelf: 'stretch', gap: spacing.sm },
  trigger: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start' },
  pressed: { opacity: 0.7 },
  title: { fontSize: fontSize['3xl'], fontWeight: '700', color: t.text },
  chevron: { marginTop: 4 },
  panel: {
    padding: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.bgElevated,
  },
  row: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  rowActive: { backgroundColor: withAlpha(t.accent, 0.12) },
  rowLabel: { flex: 1, fontSize: fontSize.base, fontWeight: '600', color: t.text },
  rowLabelActive: { color: t.accentText },
}));
