import { useState } from 'react';
import { Text, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUpRight, LogOut } from 'lucide-react-native';

import { LogoMark } from '@/components/auth/LogoMark';
import { ModuleSwitcherButton } from '@/components/modules/ModuleSwitcherButton';
import { ModuleBadge } from '@/components/modules/ModuleBadge';
import { Button, Screen } from '@/components/ui';
import { useAuth } from '@/auth/AuthProvider';
import { openWebPage } from '@/lib/openWeb';
import {
  accessibleModules,
  getModuleHref,
  isBatipowerModule,
  isMobileAvailable,
  MODULES,
} from '@/modules/registry';
import { fontSize, makeStyles, radius, spacing, typography, useTheme } from '@/theme';

/**
 * Écran d'attente d'un module pas encore ouvert sur mobile (ex. PARTNER, MARQUE…).
 * Il garde le sélecteur de module à portée de main pour pouvoir changer de module,
 * même quand celui-ci n'a encore rien à proposer.
 *
 * Aucune redirection n'est faite vers un module inaccessible : un compte sans module
 * reconnu retombe sur la version générique de l'écran, ce qui évite toute boucle.
 */
export default function ModuleComingSoonScreen() {
  const styles = useStyles();
  const t = useTheme();
  const { user, logout } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loggingOut, setLoggingOut] = useState(false);
  if (!user) return null;

  const owned = accessibleModules(user);
  const meta = isBatipowerModule(id) && owned.includes(id) ? MODULES[id] : null;

  // Module disponible sur mobile (lien profond, route obsolète) : on y va directement.
  if (meta && isMobileAvailable(meta.id, user)) return <Redirect href={getModuleHref(meta.id, user)} />;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const Icon = meta?.icon;

  return (
    <Screen scroll contentStyle={styles.content}>
      {meta ? (
        <View style={styles.switcher}>
          <ModuleSwitcherButton active={meta.id} />
        </View>
      ) : null}

      <View style={styles.header}>
        {meta && Icon ? (
          <LinearGradient
            colors={[meta.accent, `${meta.accent}B8`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.moduleIcon}
          >
            <Icon size={32} color={meta.fg} />
          </LinearGradient>
        ) : (
          <LogoMark size={64} />
        )}
        <Text style={styles.title} accessibilityRole="header">
          {meta ? meta.fullName : 'Aucun module disponible'}
        </Text>
        <Text style={styles.tagline}>{meta ? meta.tagline : 'Application Batipower Pro'}</Text>
        <Text style={styles.description}>
          {meta
            ? `Ce module n'est pas disponible sur mobile pour votre compte. L'espace web reste accessible.`
            : `Votre compte n'a pas encore accès à un module de l'application mobile. Pour l'instant, seuls Batipower HUB, Batipower PARTNER (achats) et Batipower ADMIN (réservé aux superadministrateurs) sont proposés.`}
        </Text>
      </View>

      {owned.length > 0 ? (
        <View style={styles.modules}>
          <Text style={styles.modulesLabel}>Vos modules</Text>
          <View style={styles.badges}>
            {owned.map((moduleId) => (
              <ModuleBadge key={moduleId} module={moduleId} />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="Ouvrir l'espace web"
          onPress={() => void openWebPage('/login')}
          trailingIcon={<ArrowUpRight size={18} color={t.onAccent} />}
        />
        <Button
          label="Se déconnecter"
          variant="ghost"
          loading={loggingOut}
          onPress={() => void handleLogout()}
          leadingIcon={<LogOut size={16} color={t.textMuted} />}
        />
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: { gap: spacing['3xl'] },
  switcher: { alignItems: 'flex-end' },
  header: { alignItems: 'center', gap: spacing.sm },
  moduleIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { ...typography.title, color: t.text, textAlign: 'center', marginTop: spacing.sm },
  tagline: { fontSize: fontSize.sm, fontWeight: '600', color: t.textMuted },
  description: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    lineHeight: 21,
    color: t.textSubtle,
    textAlign: 'center',
  },
  modules: { alignItems: 'center', gap: spacing.sm },
  modulesLabel: { ...typography.label, color: t.textSubtle },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  actions: { gap: spacing.sm },
}));
