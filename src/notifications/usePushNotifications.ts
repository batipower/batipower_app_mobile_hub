import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { HUB_SALE_CATEGORY } from './constants';
import { registerPushToken, unregisterStoredPushToken } from './pushRegistration';

/**
 * Les notifications push distantes ne tournent ni sur simulateur ni dans Expo Go : leur token
 * serait celui d'Expo Go (autre projet EAS), inutilisable pour le Hub.
 */
function canReceivePush(): boolean {
  return Device.isDevice && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

/**
 * Demande la permission si elle n'a jamais été tranchée. Un refus définitif (iOS ne redemande
 * pas) met fin à la tentative sans insister.
 */
async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Obtient le token Expo Push et l'enregistre auprès du back. Renvoie le token enregistré, ou
 * `null` si la permission est refusée ou si l'appareil ne peut pas recevoir de push.
 */
async function obtainAndRegisterToken(
  isCancelled: () => boolean,
  alreadyRegistered: string | null,
): Promise<string | null> {
  if (!(await ensurePermission()) || isCancelled()) return null;

  // Catégorie portée par l'extension de contenu iOS (carte « Nouvelle vente »).
  await Notifications.setNotificationCategoryAsync(HUB_SALE_CATEGORY, []);

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  if (isCancelled() || token === alreadyRegistered) return alreadyRegistered;

  await registerPushToken(token, Platform.OS === 'android' ? 'android' : 'ios');
  if (isCancelled()) {
    // Déconnexion survenue pendant l'enregistrement : on retire aussitôt le token.
    await unregisterStoredPushToken();
    return null;
  }
  return token;
}

/**
 * Enregistre l'appareil pour les notifications de vente tant que `enabled` est vrai (session
 * ouverte avec un compte réellement SUPERADMIN). Sans effet sinon : aucun appel réseau, aucune
 * demande de permission.
 *
 * `enabled` doit rester stable pendant une impersonation (le compte réel ne change pas) : le
 * token n'est ainsi ni réenregistré ni redemandé quand on usurpe un autre compte.
 *
 * La synchronisation est rejouée au retour au premier plan, pour rattraper un enregistrement
 * échoué hors ligne ou une permission accordée depuis les Réglages.
 */
export function usePushNotifications(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !canReceivePush()) return;

    let cancelled = false;
    let inFlight = false;
    let registeredToken: string | null = null;

    // Bannière + liste au premier plan, sans badge : la carte riche n'existe que côté système.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    const sync = async () => {
      if (inFlight || cancelled) return;
      inFlight = true;
      try {
        registeredToken = await obtainAndRegisterToken(() => cancelled, registeredToken);
      } catch (error) {
        // Hors ligne ou serveur indisponible : nouvel essai au prochain retour au premier plan.
        if (__DEV__) console.warn('[push] enregistrement du token impossible', error);
      } finally {
        inFlight = false;
      }
    };

    void sync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [enabled]);
}
