import { memo } from 'react';
import { RefreshCw } from 'lucide-react-native';

import { formatEuro } from '@/lib/format';
import { useTheme } from '@/theme';
import type { RenegotiationMessageAttachment } from '@/types/discussions';

import { RENEGOTIATION_STATUS } from '../teamHelpers';
import { CompactCard } from './CompactCard';

type RenegotiationCardProps = {
  attachment: RenegotiationMessageAttachment;
  /** Aperçu du composer : affiche la croix de retrait. */
  onRemove?: () => void;
};

/** Carte compacte d'un produit en renégociation jointe à un message d'équipe. */
export const RenegotiationCard = memo(function RenegotiationCard({
  attachment,
  onRemove,
}: RenegotiationCardProps) {
  const t = useTheme();
  const status = RENEGOTIATION_STATUS[attachment.status];
  const meta = [
    attachment.reference ? `Réf. ${attachment.reference}` : null,
    attachment.ean ? `EAN ${attachment.ean}` : null,
    attachment.warehouse,
  ].filter((part): part is string => !!part);

  return (
    <CompactCard
      accent={t.warning}
      icon={RefreshCw}
      kind="Renégociation"
      thumbnailBase64={attachment.thumbnailBase64}
      brand={attachment.brand}
      statusLabel={status?.label ?? attachment.status}
      statusTone={status?.tone ?? 'neutral'}
      designation={attachment.designation}
      meta={meta}
      prices={[
        { label: 'PA actuel HT', value: formatEuro(attachment.currentFixPriceHT) },
        { label: 'Équilibre HT', value: formatEuro(attachment.requestedMinPriceHT) },
        {
          label: 'Proposé HT',
          value: formatEuro(attachment.proposedPriceHT),
          highlight: true,
          empty: attachment.proposedPriceHT === null,
        },
      ]}
      onRemove={onRemove}
      removeLabel="Retirer la renégociation"
    />
  );
});
