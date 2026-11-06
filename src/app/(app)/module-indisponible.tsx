import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArrowUpRight, LogOut } from 'lucide-react-native';

import { LogoMark } from '@/components/auth/LogoMark';
import { ModuleBadge } from '@/components/modules/ModuleBadge';
import { Button, Screen } from '@/components/ui';
import { useAuth } from '@/auth/AuthProvider';
import { openWebPage } from '@/lib/openWeb';
import { accessibleModules } from '@/modules/registry';
import { colors, fontSize, onDark, spacing, typography } from '@/theme';

/**
 * Atterrissage des comptes dont aucun module n'est encore ouvert sur mobile
 * (par exemple un compte PARTNER pur, tant que seul HUB est disponible).
 */
export default function ModuleUnavailableScreen() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const modules = user ? accessibleModules(user) : [];

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <LogoMark size={64} />
        <Text style={styles.title}>Module non disponible sur mobile</Text>
        <Text style={styles.description}>
          Votre compte n&apos;a pas encore accès à un module de l&apos;application. Pour
          l&apos;instant, seul Batipower HUB est proposé sur iPhone.
        </Text>
      </View>

      {modules.length > 0 ? (
        <View style={styles.modules}>
          <Text style={styles.modulesLabel}>Vos modules</Text>
          <View style={styles.badges}>
            {modules.map((id) => (
              <ModuleBadge key={id} module={id} />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="Ouvrir l'espace web"
          onPress={() => void openWebPage('/login')}
          trailingIcon={<ArrowUpRight size={18} color={colors.white} />}
        />
        <Button
          label="Se déconnecter"
          variant="ghost"
          loading={loggingOut}
          onPress={() => void handleLogout()}
          leadingIcon={<LogOut size={16} color={onDark.textMuted} />}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', gap: spacing['3xl'] },
  header: { alignItems: 'center', gap: spacing.lg },
  title: { ...typography.title, color: colors.white, textAlign: 'center', marginTop: spacing.sm },
  description: {
    fontSize: fontSize.sm,
    lineHeight: 21,
    color: onDark.textSubtle,
    textAlign: 'center',
  },
  modules: { alignItems: 'center', gap: spacing.sm },
  modulesLabel: { ...typography.label, color: onDark.textSubtle },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  actions: { gap: spacing.sm },
});
