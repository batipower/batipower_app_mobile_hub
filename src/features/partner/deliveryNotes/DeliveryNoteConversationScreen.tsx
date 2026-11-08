import { Stack, useLocalSearchParams } from 'expo-router';

import { partnerDeliveryNotesApi } from '@/api/partnerDeliveryNotes';
import { useAuth } from '@/auth/AuthProvider';

import { PARTNER_DELIVERY_NOTES_KEY, partnerDeliveryNoteMessagesKey } from '../queryKeys';
import { ConversationScreen, type ConversationMessage } from '../shared/ConversationScreen';

/** Fil de messages d'un BL : échanges sur l'écart de prix entre acheteurs et responsables. */
export function DeliveryNoteConversationScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const { user } = useAuth();
  if (!uuid) return null;

  return (
    <>
      <Stack.Screen options={{ title: 'Messages' }} />
      <ConversationScreen
        queryKey={partnerDeliveryNoteMessagesKey(uuid)}
        load={async (signal) => {
          const messages = await partnerDeliveryNotesApi.listMessages(uuid, { signal });
          return messages.map<ConversationMessage>((message) => ({
            id: message.id,
            authorName: message.authorName,
            authorRole: message.authorRole,
            content: message.content,
            createdAt: message.createdAt,
            mine: message.authorUserId === user?.id,
          }));
        }}
        send={(content) => partnerDeliveryNotesApi.postMessage(uuid, content)}
        // Le dernier message affiché sur les lignes et sur la fiche suit le fil.
        invalidate={[PARTNER_DELIVERY_NOTES_KEY]}
        emptyText="Aucun message sur ce BL."
        placeholder="Écrire un message sur ce BL…"
      />
    </>
  );
}
