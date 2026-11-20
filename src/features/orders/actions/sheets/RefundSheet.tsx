import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, InfoRow } from '@/components/ui';
import { formatEuro } from '@/lib/format';
import { fontSize, makeStyles, spacing } from '@/theme';
import type { RefundMode, RefundOrderBody } from '@/types/orderActions';

import { ActionSheet } from '../components/ActionSheet';
import { ChoiceChips, Field, Input, Note, Stepper } from '../components/SheetFields';
import { isRefundedPaymentStatus, parseAmount } from '../orderActionRules';
import type { OrderActions, OrderDetailData } from '../useOrderActions';

type Props = { data: OrderDetailData; actions: OrderActions };

type Step = 'form' | 'confirm';

const MODE_LABELS: Record<RefundMode, string> = {
  total: 'Total',
  products: 'Partiel, par produits',
  custom: 'Partiel, montant libre',
};

/**
 * Remboursement : crée l'avoir puis rembourse le client (chaîné côté serveur). Même parcours que
 * le site HUB : formulaire, puis confirmation avec récapitulatif. Un avoir total ne peut jamais
 * suivre un autre remboursement ; les partiels restent possibles tant que le cumul ne dépasse pas
 * le total de la commande (contrôlé par le serveur).
 */
export function RefundSheet({ data, actions }: Props) {
  const styles = useStyles();
  const { order } = data;
  const [step, setStep] = useState<Step>('form');
  const [mode, setMode] = useState<RefundMode>('total');
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(order.rows.map((row) => [row.reference, row.quantity])),
  );
  const [customAmount, setCustomAmount] = useState('');

  const alreadyRefunded = isRefundedPaymentStatus(order.paymentStatus);
  const parsedAmount = parseAmount(customAmount);
  const hasValidAmount = parsedAmount !== null && parsedAmount > 0;
  const exceedsTotal = hasValidAmount && order.totalPaid != null && parsedAmount > order.totalPaid;

  const selected = order.rows
    .map((row) => ({ row, quantity: quantities[row.reference] ?? 0 }))
    .filter((item) => item.quantity > 0);

  const totalBlocked = alreadyRefunded && mode === 'total';
  const canContinue =
    !totalBlocked &&
    (mode === 'total' ||
      (mode === 'products' && selected.length > 0) ||
      (mode === 'custom' && hasValidAmount && !exceedsTotal));

  const buildBody = (): RefundOrderBody => {
    if (mode === 'products') {
      return {
        mode,
        products: selected.map(({ row, quantity }) => ({ reference: row.reference, quantity })),
      };
    }
    if (mode === 'custom' && parsedAmount !== null) return { mode, customAmount: parsedAmount };
    return { mode: 'total' };
  };

  const pending = actions.refundMutation.isPending;

  return (
    <ActionSheet
      visible
      title={step === 'form' ? 'Rembourser le client' : 'Confirmer le remboursement'}
      onClose={actions.closeSheet}
      closeDisabled={pending}
      footer={
        step === 'form' ? (
          <Button label="Continuer" disabled={!canContinue} onPress={() => setStep('confirm')} />
        ) : (
          <>
            <Button
              label="Confirmer le remboursement"
              loading={pending}
              onPress={() => actions.refundMutation.mutate(buildBody())}
            />
            <Button label="Retour" variant="outline" disabled={pending} onPress={() => setStep('form')} />
          </>
        )
      }
    >
      {step === 'form' ? (
        <>
          <Note>Commande {order.reference} : crée un avoir puis rembourse le client.</Note>

          {alreadyRefunded ? (
            <Note tone="warning">
              Cette commande semble déjà remboursée ({order.paymentStatus}). Un avoir total n’est plus
              possible ; un avoir partiel n’est accepté que si le cumul des avoirs ne dépasse pas le total
              de la commande.
            </Note>
          ) : null}

          <Field label="Type de remboursement">
            <ChoiceChips
              options={(Object.keys(MODE_LABELS) as RefundMode[]).map((value) => ({
                value,
                label: MODE_LABELS[value],
              }))}
              value={mode}
              onChange={setMode}
            />
          </Field>

          {mode === 'products' ? (
            <Field label="Quantités à rembourser">
              {order.rows.map((row) => (
                <View key={row.reference} style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={2}>
                      {row.name ?? row.reference}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {row.reference} · commandé : {row.quantity}
                    </Text>
                  </View>
                  <Stepper
                    value={quantities[row.reference] ?? 0}
                    min={0}
                    max={row.quantity}
                    label={row.reference}
                    onChange={(value) => setQuantities((prev) => ({ ...prev, [row.reference]: value }))}
                  />
                </View>
              ))}
            </Field>
          ) : null}

          {mode === 'custom' ? (
            <Field label="Montant à rembourser (€ TTC)">
              <Input
                value={customAmount}
                onChangeText={setCustomAmount}
                keyboardType="decimal-pad"
                placeholder="0,00"
                invalid={exceedsTotal}
                accessibilityLabel="Montant à rembourser en euros"
              />
              {exceedsTotal && order.totalPaid != null ? (
                <Note tone="danger">
                  Le montant ne peut pas dépasser le total payé ({formatEuro(order.totalPaid)}).
                </Note>
              ) : null}
            </Field>
          ) : null}

          {order.totalPaid != null ? (
            <Note>Montant total payé : {formatEuro(order.totalPaid)}</Note>
          ) : null}
        </>
      ) : (
        <>
          <View style={styles.recap}>
            <InfoRow label="Commande" value={order.reference} />
            <InfoRow label="Type" value={mode === 'total' ? 'Total' : 'Partiel'} />
            <InfoRow label="Détail" value={MODE_LABELS[mode]} />
            {order.totalPaid != null ? (
              <InfoRow label="Total payé" value={formatEuro(order.totalPaid)} />
            ) : null}
            {mode === 'custom' && parsedAmount !== null ? (
              <InfoRow label="À rembourser" value={formatEuro(parsedAmount)} />
            ) : null}
          </View>

          {mode === 'products'
            ? selected.map(({ row, quantity }) => (
                <View key={row.reference} style={styles.row}>
                  <Text style={[styles.rowName, styles.rowText]} numberOfLines={2}>
                    {row.name ?? row.reference}
                  </Text>
                  <Text style={styles.rowName}>× {quantity}</Text>
                </View>
              ))
            : null}

          <Note tone="warning">Cette action crée un avoir et ne peut pas être annulée.</Note>
        </>
      )}
    </ActionSheet>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, gap: 2 },
  rowName: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  rowMeta: { fontSize: fontSize.xs, color: t.textMuted },
  recap: { gap: spacing.sm },
}));
