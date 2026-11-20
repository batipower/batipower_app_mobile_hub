import { useState } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui';
import type { HubCancellationReasonCategory } from '@/types/orderActions';

import { ActionSheet } from '../components/ActionSheet';
import { ChoiceChips, Field, Input, Note, SwitchRow } from '../components/SheetFields';
import {
  CANCELLATION_REASON_LABELS,
  IMMEDIATE_CANCELLATION_WAREHOUSE,
  MARKETPLACE_CUSTOMER_CANCELLATION_REASON,
  cancellationReasonOptions,
  isMarketplaceOrder,
  isResendReference,
} from '../orderActionRules';
import type { OrderActions, OrderDetailData } from '../useOrderActions';
import { useOrderTargetWarehouses } from '../useOrderTargetWarehouses';

type Props = { data: OrderDetailData; actions: OrderActions };

/**
 * Demande d'annulation. Sur le QG (aucun logisticien externe) elle est validée immédiatement et
 * peut rembourser le client sur PrestaShop ; ailleurs elle attend la validation de l'entrepôt.
 */
export function CancellationSheet({ data, actions }: Props) {
  const { user } = useAuth();
  const { order } = data;
  const current = order.warehouseOrder?.warehouseAffectation;
  const { options } = useOrderTargetWarehouses([
    current,
    IMMEDIATE_CANCELLATION_WAREHOUSE,
    'FLEVY',
    'DOMBASLE',
  ]);

  const [warehouse, setWarehouse] = useState(current || IMMEDIATE_CANCELLATION_WAREHOUSE);
  const [category, setCategory] = useState<HubCancellationReasonCategory>('OTHER');
  const [reason, setReason] = useState('');
  const [autoRefund, setAutoRefund] = useState(true);

  const isResend = isResendReference(order.reference);
  const isMarketplaceCustomer = category === 'MARKETPLACE_CUSTOMER';
  const isImmediate = warehouse === IMMEDIATE_CANCELLATION_WAREHOUSE;
  const refundLocked = isMarketplaceCustomer || isResend;
  const reasonOptions = cancellationReasonOptions(isMarketplaceOrder(order.origin));
  const ready = isMarketplaceCustomer || reason.trim().length > 0;

  const changeCategory = (next: HubCancellationReasonCategory) => {
    setCategory(next);
    if (next === 'MARKETPLACE_CUSTOMER') {
      // La marketplace rembourse le client : aucun remboursement PrestaShop.
      setReason(MARKETPLACE_CUSTOMER_CANCELLATION_REASON);
      setAutoRefund(false);
    } else if (category === 'MARKETPLACE_CUSTOMER') {
      setReason('');
      setAutoRefund(true);
    }
  };

  return (
    <ActionSheet
      visible
      title="Demander l'annulation"
      onClose={actions.closeSheet}
      closeDisabled={actions.cancelMutation.isPending}
      footer={
        <Button
          label={isImmediate ? 'Annuler la commande' : 'Envoyer la demande'}
          loading={actions.cancelMutation.isPending}
          disabled={!ready}
          onPress={() =>
            actions.cancelMutation.mutate({
              warehouse,
              reason:
                reason.trim() || (isMarketplaceCustomer ? MARKETPLACE_CUSTOMER_CANCELLATION_REASON : ''),
              reasonCategory: category,
              requestedByName: user?.name || 'HUB',
              autoRefund: autoRefund && !isResend,
            })
          }
        />
      }
    >
      <Note>Commande {order.reference}.</Note>

      <Field label="Entrepôt concerné">
        <ChoiceChips options={options} value={warehouse} onChange={setWarehouse} />
      </Field>

      <Field label="Motif">
        <ChoiceChips
          options={reasonOptions.map((value) => ({
            value,
            label: CANCELLATION_REASON_LABELS[value],
          }))}
          value={category}
          onChange={changeCategory}
        />
      </Field>

      <Field label={isMarketplaceCustomer ? 'Précision (facultatif)' : 'Détail du motif'}>
        <Input
          value={reason}
          onChangeText={setReason}
          multiline
          placeholder="Motif de l'annulation…"
          accessibilityLabel="Détail du motif d'annulation"
        />
      </Field>

      <SwitchRow
        label="Remboursement automatique"
        value={autoRefund && !isResend}
        onValueChange={setAutoRefund}
        disabled={refundLocked}
      />

      {isResend ? (
        <Note>
          Renvoi interne, absent de PrestaShop : aucun remboursement. La commande de renvoi passera au
          statut « Annulé » une fois l’annulation validée.
        </Note>
      ) : null}
      {isImmediate ? (
        <Note>
          Validation immédiate (sans validation par l’entrepôt)
          {isResend || !autoRefund || isMarketplaceCustomer
            ? '.'
            : ' : le client sera remboursé automatiquement sur PrestaShop.'}
        </Note>
      ) : null}
    </ActionSheet>
  );
}
