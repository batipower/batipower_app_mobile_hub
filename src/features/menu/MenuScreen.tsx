import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { roleLabel } from '@/modules/roles';
import {
  fontSize,
  hitTarget,
  makeStyles,
  radius,
  spacing,
  typography,
  useTheme,
  withAlpha,
} from '@/theme';

import { menuSectionsFor, type HubMenuEntry } from './hubMenu';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0]];
  return letters
    .map((part) => part?.charAt(0) ?? '')
    .join('')
    .toUpperCase();
}

/** Lanceur des pages secondaires du HUB : carte du compte, puis les entrées par section. */
export function MenuScreen() {
  const styles = useStyles();
  const t = useTheme();
  const { user } = useAuth();
  if (!user) return null;

  const groups = menuSectionsFor(user.role).map((group) => ({
    ...group,
    // Le profil a sa propre carte en tête de menu.
    entries: group.entries.filter((entry) => entry.id !== 'profil'),
  }));

  const open = (entry: HubMenuEntry) => router.push(entry.href);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Profil de ${user.name}`}
        onPress={() => router.push('/hub/menu/profil')}
        style={({ pressed }) => [styles.row, styles.profile, pressed && styles.rowPressed]}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user.name)}</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.label} numberOfLines={1}>
            {user.name}
          </Text>
          <Text style={styles.description} numberOfLines={1}>
            {roleLabel(user.role)} · {user.email}
          </Text>
        </View>
        <ChevronRight size={18} color={t.textFaint} />
      </Pressable>

      {groups
        .filter((group) => group.entries.length > 0)
        .map((group) => (
          <View key={group.section} style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {group.section}
            </Text>
            {group.entries.map((entry) => {
              const Icon = entry.icon;
              return (
                <Pressable
                  key={entry.id}
                  accessibilityRole="button"
                  accessibilityLabel={entry.label}
                  accessibilityHint={entry.description}
                  onPress={() => open(entry)}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                >
                  <View style={styles.iconWrap}>
                    <Icon size={20} color={t.accentText} />
                  </View>
                  <View style={styles.body}>
                    <Text style={styles.label}>{entry.label}</Text>
                    <Text style={styles.description} numberOfLines={2}>
                      {entry.description}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={t.textFaint} />
                </Pressable>
              );
            })}
          </View>
        ))}
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  scroll: { flex: 1, backgroundColor: t.bg },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'], gap: spacing['2xl'] },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.label, color: t.textSubtle, paddingHorizontal: spacing.xs },
  row: {
    minHeight: hitTarget + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  profile: { marginTop: spacing.sm },
  rowPressed: { backgroundColor: t.cardPressed },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(t.accent, 0.12),
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(t.accent, 0.12),
    borderWidth: 1,
    borderColor: withAlpha(t.accent, 0.3),
  },
  avatarText: { fontSize: fontSize.base, fontWeight: '700', color: t.accentText },
  body: { flex: 1, gap: 2 },
  label: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  description: { fontSize: fontSize.xs, color: t.textMuted },
}));
