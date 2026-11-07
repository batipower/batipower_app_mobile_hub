import { useEffect } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { HUB_SALE_TYPE } from './constants';

const DAY_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const PARIS_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function todayInParis(): string {
  const parts = Object.fromEntries(
    PARIS_DAY.formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Ouvre les commandes du jour de la vente dans le Cockpit (la marge y reste derrière son oeil). */
function openSaleDay(response: Notifications.NotificationResponse) {
  // Toucher la notification, ou le bouton « Ouvrir » de la carte (action par défaut).
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  if (data?.type !== HUB_SALE_TYPE) return;

  const orderDate = typeof data.orderDate === 'string' ? data.orderDate : '';
  const date = DAY_KEY_PATTERN.test(orderDate) ? orderDate : todayInParis();

  // `navigate` d'abord : à froid, la pile du Cockpit contient ainsi sa liste sous le jour ouvert.
  router.navigate('/hub/cockpit');
  router.push({ pathname: '/hub/cockpit/jour/[date]', params: { date } });
}

/**
 * Navigation déclenchée par une notification de vente. Active seulement quand `enabled` est vrai
 * (session ouverte, compte pouvant ouvrir le Cockpit) : sinon aucune navigation, et la réponse
 * est écartée pour ne pas être rejouée plus tard. Ne contourne donc pas `Stack.Protected`, et à
 * froid elle attend la fin de la vérification de session (le splash n'est pas retenu).
 */
export function useNotificationNavigation(enabled: boolean, canOpenCockpit: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const consume = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      Notifications.clearLastNotificationResponse();
      if (canOpenCockpit) openSaleDay(response);
    };

    // Lancement à froid (ou tap reçu avant l'ouverture de session) : réponse mémorisée par le système.
    consume(Notifications.getLastNotificationResponse());

    const subscription = Notifications.addNotificationResponseReceivedListener(consume);
    return () => subscription.remove();
  }, [enabled, canOpenCockpit]);
}
