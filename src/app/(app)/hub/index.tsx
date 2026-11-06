import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Hammer } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { ModuleBadge } from '@/components/modules/ModuleBadge';
import { Card } from '@/components/ui';
import { MODULES } from '@/modules/registry';
import { roleLabel } from '@/modules/roles';
import { colors, fontSize, onDark, radius, spacing, typography, withAlpha } from '@/theme';

/** Accueil du module HUB : placeholder qui valide le parcours de connexion de bout en bout. */
export default function HubHomeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  if (!user) return null;

  const firstName = user.name.trim().split(/\s+/)[0] ?? user.name;

  return (
    <ScrollView
      style={styles.scroll}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing['2xl'] }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <ModuleBadge module="HUB" />
        <Text style={styles.greeting} accessibilityRole="header">
          Bonjour, {firstName}
        </Text>
        <Text style={styles.tagline}>{MODULES.HUB.tagline}</Text>
      </View>

      <Card>
        <View style={styles.cardBody}>
          <View style={styles.status}>
            <CheckCircle2 size={18} color={colors.green} />
            <Text style={styles.statusText}>Connexion réussie</Text>
          </View>
          <Text style={styles.cardText}>
            Connecté en tant que <Text style={styles.strong}>{user.email}</Text>
            {' · '}
            {roleLabel(user.role)}
          </Text>
        </View>
      </Card>

      <View style={styles.soon}>
        <View style={styles.soonIcon}>
          <Hammer size={20} color={onDark.textMuted} />
        </View>
        <View style={styles.soonBody}>
          <Text style={styles.soonTitle}>Application en construction</Text>
          <Text style={styles.soonText}>
            Les fonctionnalités du module HUB (logistique, préparation, SAV…) arriveront
            progressivement.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.black },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'], gap: spacing['2xl'] },
  header: { gap: spacing.sm },
  greeting: { fontSize: fontSize['3xl'], fontWeight: '700', color: colors.white },
  tagline: { fontSize: fontSize.sm, color: onDark.textSubtle },
  cardBody: { gap: spacing.md },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusText: { ...typography.button, color: colors.white },
  cardText: { fontSize: fontSize.sm, lineHeight: 20, color: onDark.textMuted },
  strong: { color: colors.white, fontWeight: '600' },
  soon: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: onDark.border,
    backgroundColor: withAlpha(colors.white, 0.02),
  },
  soonIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: onDark.surface,
  },
  soonBody: { flex: 1, gap: spacing.xs },
  soonTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.white },
  soonText: { fontSize: fontSize.sm, lineHeight: 20, color: onDark.textSubtle },
});
