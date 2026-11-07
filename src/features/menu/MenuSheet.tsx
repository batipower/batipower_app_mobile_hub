import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { LogOut, Moon, Sun, SunMoon, type LucideIcon } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { ModuleSwitcherButton } from '@/components/modules/ModuleSwitcherButton';
import { roleLabel } from '@/modules/roles';
import { openModuleSwitcher } from '@/modules/switchModule';
import {
  colors,
  fontSize,
  makeStyles,
  radius,
  spacing,
  THEME_PREFERENCES,
  useTheme,
  useThemePreference,
  withAlpha,
  type ThemePreference,
} from '@/theme';

import { menuSectionsFor, type HubMenuEntry } from './hubMenu';
import { openFromMenu } from './navigation';

const APPEARANCE: Record<ThemePreference, { label: string; icon: LucideIcon }> = {
  dark: { label: 'Sombre', icon: Moon },
  light: { label: 'Clair', icon: Sun },
  system: { label: 'Auto', icon: SunMoon },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0]];
  return letters
    .map((part) => part?.charAt(0) ?? '')
    .join('')
    .toUpperCase();
}

/**
 * Menu du HUB, présenté en feuille native à mi-écran. Reprend le chrome de la sidebar web :
 * dégradé sombre `#131921` vers `#1A1F29`, groupes en petites capitales, entrées icône + libellé,
 * pied avec l'apparence et la déconnexion. À rendre dans un `ForcedTheme` sombre.
 */
export function MenuSheet() {
  const styles = useStyles();
  const t = useTheme();
  const { user, logout } = useAuth();
  const { preference, setPreference } = useThemePreference();
  const [loggingOut, setLoggingOut] = useState(false);
  if (!user) return null;

  const groups = menuSectionsFor(user.role);

  const open = (entry: HubMenuEntry) => {
    void Haptics.selectionAsync().catch(() => undefined);
    openFromMenu(entry.href);
  };

  const confirmLogout = () => {
    Alert.alert('Se déconnecter', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: () => {
          setLoggingOut(true);
          void logout().finally(() => setLoggingOut(false));
        },
      },
    ]);
  };

  return (
    <LinearGradient colors={[colors.black, colors.gray900]} style={styles.sheet}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(user.name)}</Text>
          </View>
          <View style={styles.identity}>
            <Text style={styles.name} numberOfLines={1}>
              {user.name}
            </Text>
            <Text style={styles.role} numberOfLines={1}>
              {roleLabel(user.role)}
            </Text>
          </View>
          <ModuleSwitcherButton
            active="HUB"
            onOpen={() => openFromMenu(() => openModuleSwitcher('HUB'))}
          />
        </View>

        {groups.map((group) => (
          <View key={group.section} style={styles.group}>
            <Text style={styles.groupTitle} accessibilityRole="header">
              {group.section}
            </Text>
            {group.entries.map((entry) => {
              const Icon = entry.icon;
              return (
                <Pressable
                  key={entry.id}
                  accessibilityRole="button"
                  accessibilityLabel={entry.label}
                  onPress={() => open(entry)}
                  style={({ pressed }) => [styles.item, pressed && styles.itemActive]}
                >
                  {({ pressed }) => (
                    <>
                      <Icon size={18} color={pressed ? t.accentText : colors.gray400} />
                      <Text style={[styles.itemLabel, pressed && styles.itemLabelActive]}>
                        {entry.label}
                      </Text>
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}

        <View style={styles.footer}>
          <View style={styles.segments} accessibilityRole="radiogroup">
            {THEME_PREFERENCES.map((key) => {
              const { label, icon: Icon } = APPEARANCE[key];
              const selected = key === preference;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityLabel={`Apparence ${label}`}
                  accessibilityState={{ selected, checked: selected }}
                  onPress={() => {
                    if (selected) return;
                    void Haptics.selectionAsync().catch(() => undefined);
                    setPreference(key);
                  }}
                  style={[styles.segment, selected && styles.segmentSelected]}
                >
                  <Icon size={14} color={selected ? t.accentText : colors.gray400} />
                  <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Se déconnecter"
            disabled={loggingOut}
            onPress={confirmLogout}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
          >
            <LogOut size={18} color={t.danger} />
            <Text style={[styles.itemLabel, { color: t.danger }]}>Se déconnecter</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const useStyles = makeStyles((t) => ({
  sheet: { flex: 1 },
  content: {
    paddingTop: spacing['2xl'],
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(t.accent, 0.15),
    borderWidth: 1,
    borderColor: withAlpha(t.accent, 0.3),
  },
  avatarText: { fontSize: fontSize.sm, fontWeight: '700', color: t.accentText },
  identity: { flex: 1, gap: 1 },
  name: { fontSize: 13, fontWeight: '700', letterSpacing: -0.2, color: colors.white },
  role: { fontSize: 12, color: colors.gray400 },
  group: { gap: spacing.xs },
  groupTitle: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: withAlpha(colors.white, 0.35),
  },
  item: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemActive: {
    backgroundColor: withAlpha(colors.green, 0.15),
    borderColor: withAlpha(colors.green, 0.2),
  },
  itemPressed: { backgroundColor: withAlpha(colors.white, 0.05) },
  itemLabel: { fontSize: fontSize.sm, fontWeight: '500', color: colors.gray400 },
  itemLabelActive: { color: t.accentText },
  footer: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: withAlpha(colors.white, 0.08),
  },
  segments: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: withAlpha(colors.white, 0.05),
  },
  segment: {
    flex: 1,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentSelected: {
    backgroundColor: withAlpha(colors.green, 0.15),
    borderColor: withAlpha(colors.green, 0.2),
  },
  segmentLabel: { fontSize: 12, fontWeight: '500', color: colors.gray400 },
  segmentLabelSelected: { color: t.accentText },
}));
