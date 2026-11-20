import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { fontSize, makeStyles, spacing } from '@/theme';
import type { HubOrderResendItem } from '@/types/orderActions';

import { ActionSheet } from '../components/ActionSheet';
import { ChoiceChips, Field, Note, Stepper } from '../components/SheetFields';
import type { OrderActions, OrderDetailData } from '../useOrderActions';

type Props = { data: OrderDetailData; actions: OrderActions };

type Mode = 'full' | 'partial';

/**
 * Renvoi au client : commande complète, ou lignes et quantités choisies. Crée une commande
 * `…-RENVOI` (ou `…-PARTIEL-RENVOI`) avec son propre suivi. SUPERADMIN et MANAGER.
 */
export function ResendSheet({ data, actions }: Props) {
  const styles = useStyles();
  const { order } = data;
  const [mode, setMode] = useState<Mode>('full');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const selected: HubOrderResendItem[] = order.rows
    .map((row) => ({ reference: row.reference, quantity: quantities[row.reference] ?? 0 }))
    .filter((item) => item.quantity > 0);
  const ready = mode === 'full' || selected.length > 0;

  return (
    <ActionSheet
      visible
      title="Renvoyer au client"
      onClose={actions.closeSheet}
      closeDisabled={actions.resendMutation.isPending}
      footer={
        <Button
          label={mode === 'full' ? 'Renvoyer la commande' : 'Renvoyer la sélection'}
          loading={actions.resendMutation.isPending}
          disabled={!ready}
          onPress={() => actions.resendMutation.mutate(mode === 'full' ? {} : { items: selected })}
        />
      }
    >
      <Note>
        Crée une commande de renvoi gratuite depuis {order.reference}, avec son propre suivi
        d’expédition.
      </Note>

      <Field label="Contenu du renvoi">
        <ChoiceChips
          options={[
            { value: 'full' as Mode, label: 'Commande complète' },
            { value: 'partial' as Mode, label: 'Certaines lignes' },
          ]}
          value={mode}
          onChange={setMode}
        />
      </Field>

      {mode === 'partial' ? (
        <Field label="Quantités à renvoyer">
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
    </ActionSheet>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, gap: 2 },
  rowName: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  rowMeta: { fontSize: fontSize.xs, color: t.textMuted },
}));
