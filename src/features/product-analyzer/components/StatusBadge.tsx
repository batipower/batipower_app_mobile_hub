import { Badge, type BadgeTone } from '@/components/ui';
import { STATUS_LABELS } from '@/features/product-analyzer/lib/constants';
import type { StagingStatus } from '@/types/hubProductAnalyzer';

const TONES: Record<StagingStatus, BadgeTone> = {
  PENDING: 'blue',
  VALIDATED: 'green',
  REJECTED: 'red',
  LAUNCHED: 'purple',
  EBAT_NOT_FOUND: 'amber',
};

/** Statut d'une analyse (en attente, lancée, introuvable EbatPro…). */
export function StatusBadge({ status }: { status: StagingStatus }) {
  return <Badge label={STATUS_LABELS[status] ?? status} tone={TONES[status] ?? 'neutral'} />;
}
