import { StyleSheet, Text, View } from 'react-native';

import { MODULES } from '@/modules/registry';
import { radius, spacing } from '@/theme';
import type { BatipowerModule } from '@/types/user';

type ModuleBadgeProps = {
  module: BatipowerModule;
  size?: 'sm' | 'md';
};

/** Pastille colorée du module (équivalent de `ModuleBadge` du front web). */
export function ModuleBadge({ module, size = 'md' }: ModuleBadgeProps) {
  const meta = MODULES[module];
  const small = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        small ? styles.badgeSm : styles.badgeMd,
        { backgroundColor: meta.accent },
      ]}
      accessibilityLabel={`Module ${meta.name}`}
    >
      <Text style={[small ? styles.textSm : styles.textMd, { color: meta.fg }]}>{meta.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: radius.sm },
  badgeSm: { paddingHorizontal: spacing.sm - 2, paddingVertical: 2 },
  badgeMd: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs },
  textSm: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  textMd: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
});
