import { memo } from 'react';
import { Tag } from 'lucide-react-native';

import { formatEuro } from '@/lib/format';
import { useTheme } from '@/theme';
import type { OpportunityMessageAttachment } from '@/types/discussions';

import { OPPORTUNITY_STATUS } from '../teamHelpers';
import { CompactCard } from './CompactCard';
import { DepBadge } from './DepBadge';

type OpportunityCardProps = {
  attachment: OpportunityMessageAttachment;
  /** Aperçu du composer : affiche la croix de retrait. */
  onRemove?: () => void;
};

/** Carte compacte d'une opportunité de négociation jointe à un message d'équipe. */
export const OpportunityCard = memo(function OpportunityCard({
  attachment,
  onRemove,
}: OpportunityCardProps) {
  const t = useTheme();
  const status = OPPORTUNITY_STATUS[attachment.status];
  const meta = [
    attachment.reference ? `Réf. ${attachment.reference}` : null,
    attachment.ean ? `EAN ${attachment.ean}` : null,
    attachment.warehouse,
  ].filter((part): part is string => !!part);

  return (
    <CompactCard
      accent={t.accent}
      icon={Tag}
      kind="Opportunité de négociation"
      thumbnailBase64={attachment.thumbnailBase64}
      brand={attachment.brand}
      statusLabel={status?.label ?? attachment.status}
      statusTone={status?.tone ?? 'neutral'}
      badge={attachment.isDep ? <DepBadge depWarehouse={attachment.depWarehouse} /> : null}
      designation={attachment.designation}
      meta={meta}
      prices={[
        { label: 'Demandé HT', value: formatEuro(attachment.requestedMinPriceHT) },
        {
          label: 'Proposé HT',
          value: formatEuro(attachment.proposedPriceHT),
          highlight: true,
          empty: attachment.proposedPriceHT === null,
        },
      ]}
      onRemove={onRemove}
      removeLabel="Retirer l'opportunité"
    />
  );
});
