import { useEffect } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { deployedPricesFromPush, openDeployment } from '@/features/deployment/navigation';
import { openPalletCandidate } from '@/features/palletFlow/navigation';
import { openOpportunityFromLink } from '@/features/partner/navigation';
import { openQuoteFromLink } from '@/features/quotes/navigation';

import {
  HUB_DEPLOYMENT_TYPE,
  HUB_OPPORTUNITY_EVENT_TYPE,
  HUB_PALLET_CANDIDATE_TYPE,
  HUB_QUOTE_EVENT_TYPE,
  HUB_QUOTE_REQUEST_TYPE,
  HUB_SALE_TYPE,
} from './constants';

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

type NotificationAccess = { cockpit: boolean; quotes: boolean };

/**
 * Ouvre l'écran cible d'une notification, selon son `data.type` : les commandes du jour d'une
 * vente (Cockpit, la marge y reste derrière son oeil), la fiche d'une opportunité acceptée ou
 * refusée, la page Déploiement d'un produit, la page d'arbitrage d'un candidat palette,
 * la fiche d'une nouvelle demande de devis
 * ou l'éditeur d'un devis dont le statut a changé. Un type inconnu, ou un compte sans le droit
 * correspondant, n'ouvre rien.
 */
function openFromNotification(response: Notifications.NotificationResponse, access: NotificationAccess) {
  // Toucher la notification, ou le bouton « Ouvrir » de la carte (action par défaut).
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  const type = data?.type;

  if (type === HUB_SALE_TYPE && access.cockpit) {
    const orderDate = typeof data?.orderDate === 'string' ? data.orderDate : '';
    const date = DAY_KEY_PATTERN.test(orderDate) ? orderDate : todayInParis();
    // `navigate` d'abord : à froid, la pile du Cockpit contient ainsi sa liste sous le jour ouvert.
    router.navigate('/hub/cockpit');
    router.push({ pathname: '/hub/cockpit/jour/[date]', params: { date } });
    return;
  }

  // Opportunités et déploiements : réservés au SUPERADMIN, comme le Cockpit.
  if (type === HUB_OPPORTUNITY_EVENT_TYPE && access.cockpit) {
    if (typeof data?.opportunityUuid === 'string' && data.opportunityUuid) {
      openOpportunityFromLink(data.opportunityUuid);
    }
    return;
  }
  if (type === HUB_DEPLOYMENT_TYPE && access.cockpit) {
    if (typeof data?.reference === 'string' && data.reference) {
      openDeployment(data.reference, deployedPricesFromPush(data.deploy));
    }
    return;
  }

  // Candidat palette : page d'arbitrage, SUPERADMIN uniquement (comme le Cockpit).
  if (type === HUB_PALLET_CANDIDATE_TYPE && access.cockpit) {
    if (typeof data?.orderReference === 'string' && data.orderReference) {
      openPalletCandidate(data.orderReference);
    }
    return;
  }

  if (!access.quotes) return;
  if (type === HUB_QUOTE_REQUEST_TYPE && typeof data?.quoteRequestId === 'string' && data.quoteRequestId) {
    openQuoteFromLink({ requestId: data.quoteRequestId });
  } else if (type === HUB_QUOTE_EVENT_TYPE && typeof data?.quoteId === 'string' && data.quoteId) {
    openQuoteFromLink({ quoteId: data.quoteId });
  }
}

/**
 * Navigation déclenchée par une notification (vente, devis). Active seulement quand `enabled` est vrai
 * (session ouverte, compte pouvant ouvrir l'écran visé) : sinon aucune navigation, et la réponse
 * est écartée pour ne pas être rejouée plus tard. Ne contourne donc pas `Stack.Protected`, et à
 * froid elle attend la fin de la vérification de session (le splash n'est pas retenu).
 */
export function useNotificationNavigation(enabled: boolean, access: NotificationAccess) {
  const { cockpit, quotes } = access;
  useEffect(() => {
    if (!enabled) return;

    const consume = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      Notifications.clearLastNotificationResponse();
      openFromNotification(response, { cockpit, quotes });
    };

    // Lancement à froid (ou tap reçu avant l'ouverture de session) : réponse mémorisée par le système.
    consume(Notifications.getLastNotificationResponse());

    const subscription = Notifications.addNotificationResponseReceivedListener(consume);
    return () => subscription.remove();
  }, [enabled, cockpit, quotes]);
}
