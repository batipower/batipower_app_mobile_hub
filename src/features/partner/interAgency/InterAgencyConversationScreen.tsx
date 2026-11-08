import { Stack, useLocalSearchParams } from 'expo-router';

import { partnerInterAgencyApi } from '@/api/partnerInterAgency';
import { useAuth } from '@/auth/AuthProvider';
import type { InterAgencyChannel } from '@/types/partnerInterAgency';

import { PARTNER_INTER_AGENCY_ORDERS_KEY, partnerInterAgencyMessagesKey } from '../queryKeys';
import { ConversationScreen, type ConversationMessage } from '../shared/ConversationScreen';

const TITLES: Record<InterAgencyChannel, string> = {
  logistics: 'Logistique',
  hub: 'HUB',
};

const EMPTY_TEXTS: Record<InterAgencyChannel, string> = {
  logistics: 'Échangez avec la logistique sur cette inter-agence. Le HUB peut consulter l\'échange.',
  hub: "Échangez avec le HUB pour expliquer pourquoi l'inter-agence est impossible.",
};

/** Fil d'une commande inter-agence, avec la logistique ou avec le HUB selon le canal de l'URL. */
export function InterAgencyConversationScreen() {
  const { reference, warehouse, channel } = useLocalSearchParams<{
    reference: string;
    warehouse: string;
    channel: string;
  }>();
  const { user } = useAuth();
  if (!reference || !warehouse) return null;
  const kind: InterAgencyChannel = channel === 'hub' ? 'hub' : 'logistics';

  return (
    <>
      <Stack.Screen options={{ title: TITLES[kind] }} />
      <ConversationScreen
        queryKey={partnerInterAgencyMessagesKey(reference, warehouse, kind)}
        load={async (signal) => {
          const messages = await partnerInterAgencyApi.listMessages(reference, warehouse, kind, {
            signal,
          });
          return messages.map<ConversationMessage>((message) => ({
            id: message.id,
            authorName: message.authorName,
            authorRole: message.authorRole,
            content: message.content,
            createdAt: message.createdAt,
            mine: message.authorUserId === user?.id,
          }));
        }}
        send={(content) => partnerInterAgencyApi.postMessage(reference, warehouse, kind, content)}
        // Les compteurs et « réponse attendue » de la liste suivent le fil.
        invalidate={[PARTNER_INTER_AGENCY_ORDERS_KEY]}
        emptyText={EMPTY_TEXTS[kind]}
        placeholder={`Écrire à ${kind === 'hub' ? 'le HUB' : 'la logistique'}…`}
      />
    </>
  );
}
