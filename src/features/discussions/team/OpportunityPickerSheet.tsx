import { Tag } from 'lucide-react-native';

import { discussionsApi } from '@/api/discussions';
import { formatEuro } from '@/lib/format';
import { useTheme } from '@/theme';
import type { DiscussionOpportunitySearchResult } from '@/types/discussions';

import { CardPickerSheet, type PickerResultView } from './components/CardPickerSheet';
import { DepBadge } from './components/DepBadge';
import { OPPORTUNITY_STATUS } from './teamHelpers';

type OpportunityPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (items: DiscussionOpportunitySearchResult[]) => void;
  /** Uuids des opportunités déjà jointes au message. */
  alreadyAttachedUuids?: readonly string[];
  /** Cartes encore ajoutables au message (10 au plus, toutes catégories confondues). */
  remainingSlots: number;
  /** Sélection unique (carte initiale à la création d'une discussion). */
  single?: boolean;
  /** Affiche la liste dans la page courante (feuille native) au lieu d'un `Modal` imbriqué. */
  inline?: boolean;
};

const NO_UUIDS: readonly string[] = [];

function describe(item: DiscussionOpportunitySearchResult): PickerResultView {
  const status = OPPORTUNITY_STATUS[item.status];
  return {
    thumbnailBase64: item.thumbnailBase64,
    brand: item.brand,
    statusLabel: status?.label ?? item.status,
    statusTone: status?.tone ?? 'neutral',
    badge: item.isDep ? <DepBadge depWarehouse={item.depWarehouse} /> : null,
    designation: item.designation,
    meta: [
      item.reference ? `Réf. ${item.reference}` : null,
      item.ean ? `EAN ${item.ean}` : null,
      item.warehouse,
    ].filter((part): part is string => !!part),
    priceLines: [
      `Demandé HT : ${formatEuro(item.requestedMinPriceHT)}`,
      item.proposedPriceHT !== null ? `Proposé HT : ${formatEuro(item.proposedPriceHT)}` : '',
    ].filter(Boolean),
  };
}

function itemLabel(item: DiscussionOpportunitySearchResult): string {
  return `Opportunité ${[item.brand, item.designation ?? item.reference].filter(Boolean).join(' ')}`;
}

function fetchResults(term: string, signal: AbortSignal) {
  return discussionsApi.searchOpportunities({ search: term || undefined, limit: 30 }, signal);
}

/** Feuille de choix d'opportunités à joindre (recherche, multi-sélection), d'après `OpportunityPickerDialog` du web. */
export function OpportunityPickerSheet({
  visible,
  onClose,
  onConfirm,
  alreadyAttachedUuids = NO_UUIDS,
  remainingSlots,
  single,
  inline,
}: OpportunityPickerSheetProps) {
  const t = useTheme();
  return (
    <CardPickerSheet
      visible={visible}
      onClose={onClose}
      title="Joindre des opportunités"
      description="Référence, EAN, désignation ou marque."
      searchPlaceholder="Rechercher une opportunité"
      kind="opportunities"
      accent={t.accent}
      icon={Tag}
      fetchResults={fetchResults}
      alreadyAttachedUuids={alreadyAttachedUuids}
      remainingSlots={remainingSlots}
      single={single}
      inline={inline}
      confirmLabel={single ? 'Choisir' : 'Ajouter'}
      describe={describe}
      itemLabel={itemLabel}
      onConfirm={onConfirm}
    />
  );
}
