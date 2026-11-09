import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { ApiError } from '@/api/client';

import {
  HUB_DEPLOYMENT_CATEGORY,
  HUB_OPPORTUNITY_CATEGORY,
  HUB_QUOTE_CATEGORY,
  HUB_SALE_CATEGORY,
} from './constants';
import { registerPushToken, unregisterStoredPushToken } from './pushRegistration';
import { registerPushSyncRunner, setPushStatus } from './pushStatus';

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

function describeError(error: unknown): string {
  if (error instanceof ApiError) return `${error.message} (HTTP ${error.status})`;
  if (error instanceof Error) return error.message;
  return 'Erreur inconnue';
}

/**
 * Obtient le token Expo Push et l'enregistre auprès du back. Renvoie le token enregistré, ou
 * `null` si la permission est refusée ou si l'appareil ne peut pas recevoir de push. Chaque issue
 * est reportée dans `pushStatus` pour l'écran de diagnostic.
 */
async function obtainAndRegisterToken(
  isCancelled: () => boolean,
  alreadyRegistered: string | null,
  force: boolean,
): Promise<string | null> {
  if (!(await ensurePermission())) {
    setPushStatus({
      state: 'denied',
      message: 'Notifications refusées : activez-les dans Réglages > Batipower Pro.',
    });
    return null;
  }
  if (isCancelled()) return null;

  // Catégorie portée par l'extension de contenu iOS (carte « Nouvelle vente »).
  await Notifications.setNotificationCategoryAsync(HUB_SALE_CATEGORY, []);
  // Pushs « Devis » : catégorie sans action (le toucher ouvre la demande ou le devis).
  await Notifications.setNotificationCategoryAsync(HUB_QUOTE_CATEGORY, []);
  // Opportunités et déploiements : catégories portées par l'extension de contenu iOS (cartes détaillées).
  await Notifications.setNotificationCategoryAsync(HUB_OPPORTUNITY_CATEGORY, []);
  await Notifications.setNotificationCategoryAsync(HUB_DEPLOYMENT_CATEGORY, []);

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    setPushStatus({ state: 'noProject', message: 'Identifiant de projet EAS introuvable.' });
    return null;
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  if (isCancelled()) return alreadyRegistered;
  if (token === alreadyRegistered && !force) {
    setPushStatus({ state: 'ok', token });
    return alreadyRegistered;
  }

  await registerPushToken(token, Platform.OS === 'android' ? 'android' : 'ios');
  if (isCancelled()) {
    // Déconnexion survenue pendant l'enregistrement : on retire aussitôt le token.
    await unregisterStoredPushToken();
    return null;
  }
  setPushStatus({ state: 'ok', token });
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
    if (!enabled) return;
    if (!canReceivePush()) {
      setPushStatus({
        state: 'unavailable',
        message: 'Push distant indisponible (simulateur ou Expo Go).',
      });
      return;
    }

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

    const sync = async (force = false) => {
      if (inFlight || cancelled) return;
      inFlight = true;
      setPushStatus({ state: 'syncing' });
      try {
        registeredToken = await obtainAndRegisterToken(() => cancelled, registeredToken, force);
      } catch (error) {
        // Hors ligne ou serveur indisponible : nouvel essai au prochain retour au premier plan.
        // L'erreur reste consultable dans le Profil, même sur un build de production.
        setPushStatus({ state: 'error', message: describeError(error) });
        if (__DEV__) console.warn('[push] enregistrement du token impossible', error);
      } finally {
        inFlight = false;
      }
    };

    registerPushSyncRunner(sync);
    void sync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });

    return () => {
      cancelled = true;
      registerPushSyncRunner(null);
      subscription.remove();
    };
  }, [enabled]);
}
