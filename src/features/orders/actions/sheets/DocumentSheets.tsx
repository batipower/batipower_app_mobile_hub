import { Button } from '@/components/ui';
import { formatDate, formatEuro } from '@/lib/format';

import { ActionSheet } from '../components/ActionSheet';
import { Note } from '../components/SheetFields';
import { DELIVERY_NOTE_FORMATS } from '../deliveryNote/deliveryNoteHtml';
import type { OrderActions, OrderDetailData } from '../useOrderActions';

type Props = { data: OrderDetailData; actions: OrderActions };

/** Choix du format du bon de livraison avant l'ouverture de la feuille d'impression. */
export function DeliveryNoteSheet({ data, actions }: Props) {
  return (
    <ActionSheet visible title="Bon de livraison" onClose={actions.closeSheet}>
      <Note>
        Imprime le bon de livraison de {data.order.reference} depuis la feuille d’impression de
        l’appareil (imprimante AirPrint, ou « Enregistrer en PDF »).
      </Note>
      {DELIVERY_NOTE_FORMATS.map((format) => (
        <Button
          key={format.key}
          label={format.label}
          variant={format.key === 'standard' ? 'primary' : 'outline'}
          onPress={() => {
            // La feuille se ferme d'abord : la feuille d'impression native ne s'ouvre pas sous un Modal.
            actions.closeSheet();
            actions.deliveryNoteMutation.mutate(format.key);
          }}
        />
      ))}
      <Note>
        Le format « Étiquette autocollante » ajoute un encadré détachable (logo, code-barres, référence)
        en haut à gauche de la première page.
      </Note>
    </ActionSheet>
  );
}

/** Avoirs PDF de la commande : un remboursement partiel peut en créer plusieurs. */
export function CreditSlipsSheet({ data, actions }: Props) {
  return (
    <ActionSheet visible title="Avoirs" onClose={actions.closeSheet}>
      <Note>Avoirs créés pour {data.order.reference}. Choisissez celui à ouvrir.</Note>
      {actions.creditSlips.map((slip) => (
        <Button
          key={slip.slipId}
          label={`Avoir ${slip.slipId} · ${formatDate(slip.slipDate) ?? slip.slipDate} · ${formatEuro(slip.totalTTC)}`}
          variant="outline"
          loading={
            actions.creditSlipMutation.isPending && actions.creditSlipMutation.variables === slip.slipId
          }
          disabled={actions.creditSlipMutation.isPending}
          onPress={() => actions.creditSlipMutation.mutate(slip.slipId)}
        />
      ))}
    </ActionSheet>
  );
}
