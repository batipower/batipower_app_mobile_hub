import { View } from 'react-native';

import { Badge } from '@/components/ui';
import { spacing } from '@/theme';
import type { InterAgencyOrder } from '@/types/partnerInterAgency';

/** Badges des fils d'une commande : logistique, et HUB dès qu'il est ouvert ou a des messages. */
export function ConversationBadges({ order }: { order: InterAgencyOrder }) {
  const logistics = order.logisticsConversation;
  const hub = order.hubConversation;
  const showHub = order.interAgencyImpossible || (hub?.messageCount ?? 0) > 0;
  const logisticsCount = logistics?.messageCount ?? 0;
  const hubCount = hub?.messageCount ?? 0;
  if (logisticsCount === 0 && !showHub && !logistics?.awaitingBuyerReply) return null;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 }}>
      {logisticsCount > 0 || logistics?.awaitingBuyerReply ? (
        <Badge
          label={`Logistique · ${logisticsCount}${logistics?.awaitingBuyerReply ? ' · réponse attendue' : ''}`}
          tone={logistics?.awaitingBuyerReply ? 'amber' : 'neutral'}
        />
      ) : null}
      {showHub ? (
        <Badge
          label={`HUB · ${hubCount}${hub?.awaitingBuyerReply ? ' · réponse attendue' : ''}`}
          tone={hub?.awaitingBuyerReply ? 'amber' : 'neutral'}
        />
      ) : null}
    </View>
  );
}
