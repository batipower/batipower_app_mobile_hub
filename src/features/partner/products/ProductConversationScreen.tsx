import { Stack, useLocalSearchParams } from 'expo-router';

import { partnerProductsApi } from '@/api/partnerProducts';
import { useAuth } from '@/auth/AuthProvider';

import {
  PARTNER_PRODUCTS_KEY,
  partnerProductDetailKey,
  partnerProductMessagesKey,
} from '../queryKeys';
import { ConversationScreen, type ConversationMessage } from '../shared/ConversationScreen';

/** Fil de messages d'un produit : questions et réponses entre acheteurs et responsables. */
export function ProductConversationScreen() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const { user } = useAuth();
  if (!reference) return null;

  return (
    <>
      <Stack.Screen options={{ title: 'Messages' }} />
      <ConversationScreen
        queryKey={partnerProductMessagesKey(reference)}
        load={async (signal) => {
          const messages = await partnerProductsApi.listMessages(reference, { signal });
          return messages.map<ConversationMessage>((message) => ({
            id: message.id,
            authorName: message.authorName,
            authorRole: message.authorRole,
            content: message.content,
            createdAt: message.createdAt,
            mine: message.authorUserId === user?.id,
          }));
        }}
        send={(content) => partnerProductsApi.postMessage(reference, content)}
        // Le compteur de la liste, le badge de l'onglet et la fiche suivent le fil.
        invalidate={[PARTNER_PRODUCTS_KEY, partnerProductDetailKey(reference)]}
        emptyText="Aucun message sur ce produit. Posez une question à l'équipe."
        placeholder="Écrire un message sur ce produit…"
      />
    </>
  );
}
