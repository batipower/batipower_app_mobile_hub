import { RefreshCw } from 'lucide-react-native';

import { discussionsApi } from '@/api/discussions';
import { formatEuro } from '@/lib/format';
import { useTheme } from '@/theme';
import type { DiscussionRenegotiationSearchResult } from '@/types/discussions';

import { CardPickerSheet, type PickerResultView } from './components/CardPickerSheet';
import { RENEGOTIATION_STATUS } from './teamHelpers';

type RenegotiationPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (items: DiscussionRenegotiationSearchResult[]) => void;
  /** Uuids des renégociations déjà jointes au message. */
  alreadyAttachedUuids?: readonly string[];
  /** Cartes encore ajoutables au message (10 au plus, toutes catégories confondues). */
  remainingSlots: number;
  /** Sélection unique (carte initiale à la création d'une discussion). */
  single?: boolean;
  /** Affiche la liste dans la page courante (feuille native) au lieu d'un `Modal` imbriqué. */
  inline?: boolean;
};

const NO_UUIDS: readonly string[] = [];

function describe(item: DiscussionRenegotiationSearchResult): PickerResultView {
  const status = RENEGOTIATION_STATUS[item.status];
  return {
    thumbnailBase64: item.thumbnailBase64,
    brand: item.brand,
    statusLabel: status?.label ?? item.status,
    statusTone: status?.tone ?? 'neutral',
    designation: item.designation,
    meta: [
      item.reference ? `Réf. ${item.reference}` : null,
      item.ean ? `EAN ${item.ean}` : null,
      item.warehouse,
    ].filter((part): part is string => !!part),
    priceLines: [
      `PA actuel HT : ${formatEuro(item.currentFixPriceHT)}`,
      item.requestedMinPriceHT !== null ? `Équilibre HT : ${formatEuro(item.requestedMinPriceHT)}` : '',
      item.proposedPriceHT !== null ? `Proposé HT : ${formatEuro(item.proposedPriceHT)}` : '',
    ].filter(Boolean),
  };
}

function itemLabel(item: DiscussionRenegotiationSearchResult): string {
  return `Renégociation ${[item.brand, item.designation ?? item.reference].filter(Boolean).join(' ')}`;
}

function fetchResults(term: string, signal: AbortSignal) {
  return discussionsApi.searchRenegotiations({ search: term || undefined, limit: 30 }, signal);
}

/** Feuille de choix de renégociations à joindre (recherche, multi-sélection), d'après `RenegotiationPickerDialog` du web. */
export function RenegotiationPickerSheet({
  visible,
  onClose,
  onConfirm,
  alreadyAttachedUuids = NO_UUIDS,
  remainingSlots,
  single,
  inline,
}: RenegotiationPickerSheetProps) {
  const t = useTheme();
  return (
    <CardPickerSheet
      visible={visible}
      onClose={onClose}
      title="Joindre des renégociations"
      description="Référence, EAN, désignation ou marque."
      searchPlaceholder="Rechercher une renégociation"
      kind="renegotiations"
      accent={t.warning}
      icon={RefreshCw}
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
