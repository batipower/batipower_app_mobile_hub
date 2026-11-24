import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ScanFace } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { useAuth } from '@/auth/AuthProvider';
import { DetailSection } from '@/components/ui';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';

/**
 * Réglage « Se reconnecter avec Face ID » du profil. Activé, il remplace la saisie de l'email,
 * du mot de passe et du code 2FA quand la session (24 h) a expiré. Masqué pendant une
 * impersonation, et quand Face ID n'est pas configuré sur l'iPhone (sauf s'il est déjà actif,
 * pour pouvoir le désactiver).
 */
export function BiometricSection() {
  const styles = useStyles();
  const t = useTheme();
  const {
    biometricAvailable,
    biometricPreference,
    enableBiometrics,
    disableBiometrics,
    isImpersonating,
    user,
  } = useAuth();
  const [busy, setBusy] = useState(false);

  const enabled = !!user && biometricPreference?.email === user.email;
  if (isImpersonating || (!biometricAvailable && !enabled)) return null;

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      if (next) {
        await enableBiometrics();
        toast.success('Face ID activé');
      } else {
        await disableBiometrics();
        toast.success('Face ID désactivé');
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
    } catch (error) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      toast.error(error instanceof Error ? error.message : 'Impossible de modifier Face ID.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DetailSection title="Connexion rapide">
      <View style={styles.row}>
        <ScanFace size={20} color={t.accentText} />
        <Text style={styles.label}>Se reconnecter avec Face ID</Text>
        <Switch
          value={enabled}
          disabled={busy}
          onValueChange={(next) => void toggle(next)}
          trackColor={{ true: t.accent }}
          accessibilityLabel="Se reconnecter avec Face ID"
        />
      </View>
      <Text style={styles.hint}>
        Quand votre session expire, Face ID suffit pour vous reconnecter, sans mot de passe ni code
        reçu par email. Se déconnecter depuis l&apos;app désactive Face ID.
      </Text>
    </DetailSection>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  label: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  hint: { fontSize: fontSize.xs, lineHeight: 17, color: t.textSubtle },
}));
