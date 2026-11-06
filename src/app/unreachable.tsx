import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RefreshCw, WifiOff } from 'lucide-react-native';

import { Button, Screen } from '@/components/ui';
import { useAuth } from '@/auth/AuthProvider';
import { colors, fontSize, onDark, radius, spacing, typography, withAlpha } from '@/theme';

/**
 * Affiché quand la session est stockée mais que le serveur est injoignable au
 * lancement : on laisse réessayer plutôt que de déconnecter l'utilisateur.
 */
export default function UnreachableScreen() {
  const { retryBootstrap, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

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
        <View style={styles.iconTile}>
          <WifiOff size={28} color={colors.green} />
        </View>
        <Text style={styles.title}>Connexion impossible</Text>
        <Text style={styles.description}>
          Le serveur Batipower est injoignable. Vérifiez votre connexion internet puis réessayez.
          Votre session est conservée.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          label="Réessayer"
          onPress={() => void retryBootstrap()}
          leadingIcon={<RefreshCw size={18} color={colors.white} />}
        />
        <Button
          label="Se déconnecter"
          variant="ghost"
          loading={loggingOut}
          onPress={() => void handleLogout()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', gap: spacing['3xl'] },
  header: { alignItems: 'center', gap: spacing.lg },
  iconTile: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(colors.green, 0.1),
    borderWidth: 1,
    borderColor: withAlpha(colors.green, 0.2),
  },
  title: { ...typography.title, color: colors.white, textAlign: 'center' },
  description: {
    fontSize: fontSize.sm,
    lineHeight: 21,
    color: onDark.textSubtle,
    textAlign: 'center',
  },
  actions: { gap: spacing.sm },
});
