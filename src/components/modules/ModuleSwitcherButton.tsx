import { Pressable, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { accessibleModules, MODULES } from '@/modules/registry';
import { openModuleSwitcher } from '@/modules/switchModule';
import { radius, spacing } from '@/theme';
import type { BatipowerModule } from '@/types/user';

type ModuleSwitcherButtonProps = {
  /** Module affiché par l'écran courant. */
  active: BatipowerModule;
  /** Remplace l'ouverture directe du sélecteur (ex. fermer d'abord une feuille). */
  onOpen?: () => void;
};

/**
 * Pastille du module courant, qui ouvre le sélecteur de module (équivalent de
 * `ModuleSwitcher` du front web). Masquée quand le compte n'a qu'un seul module.
 */
export function ModuleSwitcherButton({ active, onOpen }: ModuleSwitcherButtonProps) {
  const { user } = useAuth();
  if (!user || accessibleModules(user).length < 2) return null;

  const meta = MODULES[active];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Module actif : ${meta.fullName}`}
      accessibilityHint="Ouvre la liste des modules"
      hitSlop={8}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        if (onOpen) onOpen();
        else openModuleSwitcher(active);
      }}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={[meta.accent, `${meta.accent}B8`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Text style={[styles.label, { color: meta.fg }]}>{meta.name}</Text>
        <ChevronDown size={13} color={meta.fg} />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: radius.sm, overflow: 'hidden' },
  pressed: { opacity: 0.8 },
  gradient: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
});
