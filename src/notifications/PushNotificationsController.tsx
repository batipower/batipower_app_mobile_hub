import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubCockpit } from '@/auth/permissions';

import { useNotificationNavigation } from './useNotificationNavigation';
import { usePushNotifications } from './usePushNotifications';

/**
 * Branche les notifications de vente sur la session. À monter sous `AuthProvider`.
 *
 * - Enregistrement du token : seulement si le compte *réel* est SUPERADMIN. Pendant une
 *   impersonation, `user` est le compte usurpé et `impersonatedBy` identifie le SUPERADMIN :
 *   l'éligibilité ne bouge donc pas quand on démarre ou arrête une impersonation.
 * - Navigation : seulement si le compte affiché peut ouvrir le Cockpit (un compte usurpé qui n'a
 *   pas ce droit n'y serait renvoyé qu'à une erreur 403).
 */
export function PushNotificationsController() {
  const { status, user } = useAuth();
  const signedIn = status === 'signedIn' && user !== null;

  const realIsSuperAdmin = signedIn && (!!user.impersonatedBy || canAccessHubCockpit(user.role));
  const canOpenCockpit = signedIn && canAccessHubCockpit(user.role);

  usePushNotifications(realIsSuperAdmin);
  useNotificationNavigation(signedIn, canOpenCockpit);

  return null;
}
