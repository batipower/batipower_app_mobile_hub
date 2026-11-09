import { useAuth } from '@/auth/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { canAccessHubCockpit, canAccessHubCustomerQuotes } from '@/auth/permissions';
import { DEPLOYMENT_ROOT_KEY } from '@/features/deployment/queryKeys';
import { PARTNER_OPPORTUNITIES_KEY } from '@/features/partner/queryKeys';
import { QUOTES_ROOT_KEY } from '@/features/quotes/queryKeys';

import {
  HUB_DEPLOYMENT_TYPE,
  HUB_OPPORTUNITY_EVENT_TYPE,
  HUB_QUOTE_EVENT_TYPE,
  HUB_QUOTE_REQUEST_TYPE,
} from './constants';
import { useNotificationNavigation } from './useNotificationNavigation';
import { usePushNotifications } from './usePushNotifications';

/**
 * Branche les notifications (ventes, devis) sur la session. À monter sous `AuthProvider`.
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
  const canOpenQuotes = signedIn && canAccessHubCustomerQuotes(user.role);
  const queryClient = useQueryClient();

  usePushNotifications(realIsSuperAdmin);
  useNotificationNavigation(signedIn, { cockpit: canOpenCockpit, quotes: canOpenQuotes });

  // Un push « Devis » reçu app ouverte rafraîchit tout de suite le pipeline, les fiches et le badge
  // de l'onglet Devis (sans attendre le prochain tour de relecture).
  useEffect(() => {
    if (!canOpenQuotes) return;
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const type = (notification.request.content.data as Record<string, unknown> | undefined)?.type;
      if (type === HUB_QUOTE_REQUEST_TYPE || type === HUB_QUOTE_EVENT_TYPE) {
        void queryClient.invalidateQueries({ queryKey: QUOTES_ROOT_KEY });
      }
    });
    return () => subscription.remove();
  }, [canOpenQuotes, queryClient]);

  // Un push « Opportunité » ou « Déploiement » reçu app ouverte rafraîchit les fiches concernées.
  useEffect(() => {
    if (!canOpenCockpit) return;
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const type = (notification.request.content.data as Record<string, unknown> | undefined)?.type;
      if (type === HUB_OPPORTUNITY_EVENT_TYPE) {
        void queryClient.invalidateQueries({ queryKey: PARTNER_OPPORTUNITIES_KEY });
      } else if (type === HUB_DEPLOYMENT_TYPE) {
        void queryClient.invalidateQueries({ queryKey: DEPLOYMENT_ROOT_KEY });
      }
    });
    return () => subscription.remove();
  }, [canOpenCockpit, queryClient]);

  return null;
}
