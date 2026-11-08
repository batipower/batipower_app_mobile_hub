import { Fragment, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, LayoutGrid, LogOut, type LucideIcon } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { accessibleModules } from '@/modules/registry';
import { openModuleSwitcher } from '@/modules/switchModule';
import { fontSize, makeStyles, radius, spacing, typography, useTheme, withAlpha } from '@/theme';

import { menuSectionsFor, type HubMenuSection } from './hubMenu';
import { openFromMenu } from './navigation';

/**
 * Taille des icônes du menu. Les icônes de la barre d'onglets natifs font ~24 pt : celles du
 * menu ne doivent jamais les dépasser.
 */
const ICON_SIZE = 20;
const CHEVRON_SIZE = 16;

type MenuRow = {
  id: string;
  label: string;
  icon: LucideIcon;
  onPress: () => void;
};

type MenuGroup = { section: HubMenuSection; rows: MenuRow[] };

/**
 * Menu du HUB, présenté en feuille native à mi-écran : uniquement des lignes de navigation
 * (pages, changement de module) et la déconnexion. Il suit le thème de l'app (clair, sombre ou
 * auto) ; le contenu du profil (identité, infos du compte, apparence, impersonation) vit dans la
 * page `Profil`, simple destination du menu.
 */
export function MenuSheet() {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  if (!user) return null;

  const groups: MenuGroup[] = menuSectionsFor(user.role).map((group) => ({
    section: group.section,
    rows: group.entries.map((entry) => ({
      id: entry.id,
      label: entry.label,
      icon: entry.icon,
      onPress: () => openFromMenu(entry.href),
    })),
  }));

  // Le changement de module rejoint le groupe « Compte » (créé au besoin).
  if (accessibleModules(user).length > 1) {
    const moduleRow: MenuRow = {
      id: 'modules',
      label: 'Changer de module',
      icon: LayoutGrid,
      onPress: () => openFromMenu(() => openModuleSwitcher('HUB')),
    };
    const account = groups.find((group) => group.section === 'Compte');
    if (account) account.rows.push(moduleRow);
    else groups.push({ section: 'Compte', rows: [moduleRow] });
  }

  const press = (row: MenuRow) => {
    void Haptics.selectionAsync().catch(() => undefined);
    row.onPress();
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
    <ScrollView
      style={styles.sheet}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing['2xl'] }]}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <Text style={styles.title} accessibilityRole="header">
        Menu
      </Text>

      {groups.map((group) => (
        <View key={group.section} style={styles.group}>
          <Text style={styles.groupTitle} accessibilityRole="header">
            {group.section}
          </Text>
          <View style={styles.list}>
            {group.rows.map((row, index) => {
              const Icon = row.icon;
              return (
                <Fragment key={row.id}>
                  {index > 0 ? <View style={styles.separator} /> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={row.label}
                    onPress={() => press(row)}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  >
                    <View style={styles.iconSlot}>
                      <Icon size={ICON_SIZE} color={t.accentText} />
                    </View>
                    <Text style={styles.rowLabel} numberOfLines={1}>
                      {row.label}
                    </Text>
                    <ChevronRight size={CHEVRON_SIZE} color={t.textFaint} />
                  </Pressable>
                </Fragment>
              );
            })}
          </View>
        </View>
      ))}

      <View style={styles.list}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Se déconnecter"
          disabled={loggingOut}
          onPress={confirmLogout}
          style={({ pressed }) => [
            styles.row,
            pressed && styles.rowPressed,
            loggingOut && styles.rowDisabled,
          ]}
        >
          <View style={styles.iconSlot}>
            <LogOut size={ICON_SIZE} color={t.danger} />
          </View>
          <Text style={[styles.rowLabel, { color: t.danger }]} numberOfLines={1}>
            Se déconnecter
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  sheet: { flex: 1, backgroundColor: t.bgElevated },
  content: {
    paddingTop: spacing['2xl'],
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  title: { fontSize: fontSize.xl, fontWeight: '700', letterSpacing: -0.3, color: t.text },
  group: { gap: spacing.xs },
  groupTitle: {
    ...typography.label,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
    color: t.textSubtle,
  },
  list: {
    overflow: 'hidden',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  separator: {
    height: StyleSheet.hairlineWidth * 2,
    marginLeft: spacing.md + 28 + spacing.md,
    backgroundColor: t.border,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rowPressed: { backgroundColor: withAlpha(t.accent, 0.12) },
  rowDisabled: { opacity: 0.5 },
  iconSlot: { width: 28, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: fontSize.base, fontWeight: '500', color: t.text },
}));
