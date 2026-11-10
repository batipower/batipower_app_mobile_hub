import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { accessibleModules, isBatipowerModule, isMobileAvailable, MODULES } from '@/modules/registry';
import { MODULE_ROW_HEIGHT, switchToModule } from '@/modules/switchModule';
import { SheetHeader } from '@/components/sheet/SheetScreen';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { BatipowerModule } from '@/types/user';

/**
 * Sélecteur de module, présenté en feuille native (`formSheet`). Liste tous les modules
 * du compte, y compris ceux qui ne sont pas encore ouverts sur mobile : ils mènent à
 * un écran « bientôt disponible », pour que le changement de module reste toujours possible.
 */
export default function SwitchModuleSheet() {
  const styles = useStyles();
  const t = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ active?: string }>();
  if (!user) return null;

  const active: BatipowerModule | null = isBatipowerModule(params.active) ? params.active : null;
  const modules = accessibleModules(user);

  return (
    <View style={styles.sheet}>
      <SheetHeader title="Changer de module" closeLabel="Fermer" />
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {modules.map((id) => {
          const meta = MODULES[id];
          const Icon = meta.icon;
          const isActive = id === active;
          const available = isMobileAvailable(id, user);

          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${meta.fullName}${available ? '' : ', bientôt disponible sur mobile'}`}
              onPress={() => {
                void Haptics.selectionAsync().catch(() => undefined);
                switchToModule(id, user, active);
              }}
              style={({ pressed }) => [
                styles.row,
                isActive && { backgroundColor: withAlpha(meta.accent, 0.14) },
                pressed && styles.pressed,
              ]}
            >
              <LinearGradient
                colors={[meta.accent, `${meta.accent}B8`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.icon}
              >
                <Icon size={18} color={meta.fg} />
              </LinearGradient>
              <View style={styles.text}>
                <Text style={styles.name} numberOfLines={1}>
                  {meta.fullName}
                </Text>
                <Text style={styles.tagline} numberOfLines={1}>
                  {meta.tagline}
                </Text>
              </View>
              {!available ? (
                <View style={styles.soon}>
                  <Text style={styles.soonText}>Bientôt</Text>
                </View>
              ) : null}
              {isActive ? <Check size={18} color={t.accentText} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  sheet: { flex: 1, backgroundColor: t.bgElevated },
  list: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.xs,
  },
  row: {
    minHeight: MODULE_ROW_HEIGHT - spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  pressed: { backgroundColor: t.surfaceStrong },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  name: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  tagline: { fontSize: fontSize.xs, color: t.textSubtle },
  soon: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: t.surfaceStrong,
  },
  soonText: { fontSize: 11, fontWeight: '700', color: t.textMuted },
}));
