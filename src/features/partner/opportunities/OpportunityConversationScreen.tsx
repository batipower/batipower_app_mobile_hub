import { Stack, useLocalSearchParams } from 'expo-router';

import { partnerOpportunitiesApi } from '@/api/partnerOpportunities';
import { useAuth } from '@/auth/AuthProvider';
import { POST_NEGOTIATION_STATUSES } from '@/types/partnerOpportunities';

import {
  PARTNER_OPPORTUNITIES_KEY,
  partnerOpportunityMessagesKey,
} from '../queryKeys';
import { ConversationScreen, type ConversationMessage } from '../shared/ConversationScreen';
import { useOpportunityDetail } from './hooks/useOpportunityDetail';

/**
 * Fil de messages d'une opportunité. Après la négociation (observation, lancée, abandonnée,
 * archivée), l'envoi est fermé aux RA / RAR : le SUPERADMIN garde la main (règle du back).
 */
export function OpportunityConversationScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const { user } = useAuth();
  const { opportunity } = useOpportunityDetail(uuid);
  if (!uuid) return null;

  const closed =
    !!opportunity &&
    POST_NEGOTIATION_STATUSES.includes(opportunity.status) &&
    user?.role !== 'SUPERADMIN';

  return (
    <>
      <Stack.Screen options={{ title: 'Messages' }} />
      <ConversationScreen
        queryKey={partnerOpportunityMessagesKey(uuid)}
        load={async (signal) => {
          const messages = await partnerOpportunitiesApi.listMessages(uuid, { signal });
          return messages.map<ConversationMessage>((message) => ({
            id: message.id,
            authorName: message.authorName,
            authorRole: message.authorRole,
            content: message.content,
            createdAt: message.createdAt,
            mine: message.authorUserId != null && message.authorUserId === user?.id,
            system: message.isSystem,
          }));
        }}
        send={(content) => partnerOpportunitiesApi.postMessage(uuid, content)}
        invalidate={[PARTNER_OPPORTUNITIES_KEY]}
        emptyText="Aucun message sur cette opportunité."
        placeholder="Écrire un message…"
        composerLockedReason={
          closed
            ? "La conversation est fermée : l'opportunité n'est plus en négociation."
            : null
        }
      />
    </>
  );
}
