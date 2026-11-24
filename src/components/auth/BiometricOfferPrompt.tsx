import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { toast } from 'sonner-native';

import { useAuth } from '@/auth/AuthProvider';

/**
 * Propose d'activer Face ID juste après une connexion par mot de passe (2FA comprise). Rien
 * n'est rendu : l'invite est une alerte système, montrée une fois par connexion. « Plus tard »
 * la reproposera à la prochaine connexion, « Ne plus proposer » ne la refait plus (le réglage
 * reste disponible dans le profil).
 */
export function BiometricOfferPrompt() {
  const { biometricOfferPending, enableBiometrics, dismissBiometricOffer } = useAuth();
  const shown = useRef(false);

  useEffect(() => {
    if (!biometricOfferPending) {
      shown.current = false;
      return;
    }
    if (shown.current) return;
    // Laisse la navigation vers l'accueil se terminer avant de présenter l'alerte.
    const timer = setTimeout(() => {
      shown.current = true;
      Alert.alert(
        'Se reconnecter avec Face ID ?',
        'Quand votre session expirera, Face ID suffira pour vous reconnecter, sans mot de passe ni code reçu par email.',
        [
          {
            text: 'Activer',
            onPress: () => {
              enableBiometrics()
                .then(() => toast.success('Face ID activé'))
                .catch((error: unknown) => {
                  toast.error(
                    error instanceof Error ? error.message : 'Impossible d’activer Face ID.',
                  );
                })
                .finally(() => void dismissBiometricOffer());
            },
          },
          { text: 'Plus tard', style: 'cancel', onPress: () => void dismissBiometricOffer() },
          {
            text: 'Ne plus proposer',
            style: 'destructive',
            onPress: () => void dismissBiometricOffer({ forever: true }),
          },
        ],
        { cancelable: false },
      );
    }, 800);
    return () => clearTimeout(timer);
  }, [biometricOfferPending, enableBiometrics, dismissBiometricOffer]);

  return null;
}
