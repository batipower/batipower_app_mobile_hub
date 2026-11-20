import { useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canForceHubOrderStatus } from '@/auth/permissions';
import { Button } from '@/components/ui';

import { ActionSheet } from '../components/ActionSheet';
import { CheckRow, ChoiceChips, Field, Note } from '../components/SheetFields';
import { isOrderShipped } from '../orderActionRules';
import type { OrderActions, OrderDetailData } from '../useOrderActions';
import { useOrderTargetWarehouses } from '../useOrderTargetWarehouses';

type Props = { data: OrderDetailData; actions: OrderActions };

/**
 * Transfert d'entrepôt. Une commande déjà expédiée n'est transférable que de force, par le
 * SUPERADMIN (case à cocher), comme sur le site HUB.
 */
export function TransferSheet({ data, actions }: Props) {
  const { user } = useAuth();
  const { order } = data;
  const current = order.warehouseOrder?.warehouseAffectation ?? null;
  const { options, label, loading } = useOrderTargetWarehouses([current]);
  const [target, setTarget] = useState<string | null>(null);
  const [force, setForce] = useState(false);

  const shipped = isOrderShipped(order);
  const mayForce = !!user?.role && canForceHubOrderStatus(user.role);
  const blocked = shipped && !mayForce;
  const ready = !!target && target !== current && (!shipped || force) && !blocked;

  return (
    <ActionSheet
      visible
      title="Transférer la commande"
      onClose={actions.closeSheet}
      closeDisabled={actions.transferMutation.isPending}
      footer={
        <Button
          label="Transférer"
          loading={actions.transferMutation.isPending}
          disabled={!ready}
          onPress={() => target && actions.transferMutation.mutate({ warehouse: target, force: shipped })}
        />
      }
    >
      <Note>
        Commande {order.reference}. Entrepôt actuel : {label(current)}.
      </Note>

      {shipped ? (
        <Note tone="danger">
          Cette commande est déjà expédiée.{' '}
          {mayForce
            ? 'Le transfert doit être forcé : le colis ne change pas de main pour autant.'
            : 'Seul un SUPERADMIN peut forcer son transfert.'}
        </Note>
      ) : null}

      <Field label="Nouvel entrepôt">
        {loading ? <ActivityIndicator /> : null}
        <ChoiceChips
          options={options.map((option) => ({
            value: option.value,
            label: option.value === current ? `${option.label} (actuel)` : option.label,
            disabled: option.value === current,
          }))}
          value={target}
          onChange={setTarget}
          disabled={blocked}
        />
      </Field>

      {shipped && mayForce ? (
        <CheckRow
          label="Forcer le transfert"
          hint="Confirme le transfert malgré l'expédition."
          checked={force}
          onToggle={() => setForce((value) => !value)}
        />
      ) : null}
    </ActionSheet>
  );
}
