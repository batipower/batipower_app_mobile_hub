import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { fontSize, makeStyles, radius, spacing } from '@/theme';

import { ActionSheet } from '../components/ActionSheet';
import { ChoiceChips, Field, Note, Stepper } from '../components/SheetFields';
import {
  MAX_SHIPMENTS,
  MIN_SHIPMENTS,
  addShipmentQuantity,
  allInFirstShipment,
  buildShipmentLines,
  defaultShipmentWarehouses,
  nextFreeWarehouse,
  removeShipmentQuantity,
  repairShipmentWarehouses,
  setShipmentQuantity,
} from '../orderActionRules';
import type { OrderActions, OrderDetailData } from '../useOrderActions';
import { useOrderTargetWarehouses } from '../useOrderTargetWarehouses';

type Props = { data: OrderDetailData; actions: OrderActions };

type SplitMode = 'direct' | 'qg';

/**
 * Split manuel : répartit les lignes de la commande entre 2 à 4 envois, chacun devenant une
 * commande distincte. En mode « QG », les envois restent au QG pour un dispatch manuel ultérieur.
 */
export function SplitSheet({ data, actions }: Props) {
  const styles = useStyles();
  const { order } = data;
  const rows = useMemo(() => order.rows ?? [], [order.rows]);
  const current = order.warehouseOrder?.warehouseAffectation;
  const { options, label } = useOrderTargetWarehouses([current]);
  const targetValues = useMemo(() => options.map((option) => option.value), [options]);
  const maxShipments = Math.max(MIN_SHIPMENTS, Math.min(MAX_SHIPMENTS, targetValues.length));

  const [mode, setMode] = useState<SplitMode>('direct');
  const [chosenWarehouses, setChosenWarehouses] = useState<string[]>(() =>
    defaultShipmentWarehouses(current, targetValues, MIN_SHIPMENTS),
  );
  const [quantities, setQuantities] = useState<Record<string, number[]>>(() =>
    Object.fromEntries(
      rows.map((row) => [row.reference, allInFirstShipment(row.quantity, MIN_SHIPMENTS)]),
    ),
  );
  // Le catalogue peut arriver après l'ouverture : un entrepôt devenu inéligible ou en doublon est remplacé.
  const warehouses = useMemo(
    () => repairShipmentWarehouses(chosenWarehouses, targetValues),
    [chosenWarehouses, targetValues],
  );
  const shipmentCount = warehouses.length;

  const changeQuantity = (reference: string, position: number, value: number) =>
    setQuantities((prev) => ({
      ...prev,
      [reference]: setShipmentQuantity(prev[reference] ?? [], position, value),
    }));

  const moveAllTo = (position: number) =>
    setQuantities(
      Object.fromEntries(
        rows.map((row) => [
          row.reference,
          Array.from({ length: shipmentCount }, (_, i) => (i === position ? row.quantity : 0)),
        ]),
      ),
    );

  const addShipment = () => {
    const free = nextFreeWarehouse(targetValues, warehouses);
    if (!free || shipmentCount >= maxShipments) return;
    setChosenWarehouses([...warehouses, free]);
    setQuantities((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([reference, list]) => [reference, addShipmentQuantity(list)]),
      ),
    );
  };

  const removeShipment = (position: number) => {
    setChosenWarehouses(warehouses.filter((_, i) => i !== position));
    setQuantities((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([reference, list]) => [
          reference,
          removeShipmentQuantity(list, position),
        ]),
      ),
    );
  };

  /** Un entrepôt déjà pris par un autre envoi est échangé plutôt que dupliqué. */
  const changeWarehouse = (position: number, value: string) => {
    const swapWith = warehouses.findIndex((w, i) => i !== position && w === value);
    const next = [...warehouses];
    if (swapWith >= 0) next[swapWith] = warehouses[position] ?? value;
    next[position] = value;
    setChosenWarehouses(next);
  };

  const groups = useMemo(
    () => buildShipmentLines(rows, quantities, shipmentCount),
    [rows, quantities, shipmentCount],
  );

  const shipmentName = (position: number) =>
    mode === 'direct' ? label(warehouses[position]) : `Envoi ${position + 1}`;

  const emptyPosition = groups.findIndex((group) => group.length === 0);
  const hasDuplicate = new Set(warehouses).size !== warehouses.length;
  const validationError =
    emptyPosition >= 0
      ? `Aucun produit dans l'envoi ${emptyPosition + 1} (${shipmentName(emptyPosition)}) : affectez-lui au moins une ligne.`
      : hasDuplicate
        ? 'Choisissez des entrepôts différents pour chaque envoi.'
        : null;

  const submit = () =>
    actions.splitMutation.mutate({
      reference: order.reference,
      keepOriginalWarehouse: mode === 'qg',
      groups: groups.map((lines, position) => ({
        warehouse: warehouses[position] ?? '',
        lines,
      })),
    });

  return (
    <ActionSheet
      visible
      title="Splitter la commande"
      onClose={actions.closeSheet}
      closeDisabled={actions.splitMutation.isPending}
      footer={
        <>
          {validationError ? <Note tone="warning">{validationError}</Note> : null}
          <Button
            label="Splitter la commande"
            loading={actions.splitMutation.isPending}
            disabled={validationError !== null}
            onPress={submit}
          />
        </>
      }
    >
      <Note>
        Répartissez les produits de {order.reference} entre {MIN_SHIPMENTS} à {MAX_SHIPMENTS} envois :
        chaque envoi devient une commande distincte.
      </Note>

      <Field label="Affectation des envois">
        <ChoiceChips
          options={[
            { value: 'direct' as SplitMode, label: 'Directement aux entrepôts' },
            { value: 'qg' as SplitMode, label: 'Au QG (dispatch manuel)' },
          ]}
          value={mode}
          onChange={setMode}
        />
      </Field>

      {Array.from({ length: shipmentCount }, (_, position) => (
        <View key={position} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Envoi {position + 1}</Text>
            <View style={styles.cardActions}>
              <Button label="Tout ici" variant="ghost" onPress={() => moveAllTo(position)} />
              {position > 0 ? (
                <Button
                  label="Retirer"
                  variant="ghost"
                  destructive
                  onPress={() => removeShipment(position)}
                />
              ) : null}
            </View>
          </View>
          {mode === 'direct' ? (
            <ChoiceChips
              options={options}
              value={warehouses[position] ?? null}
              onChange={(value) => changeWarehouse(position, value)}
            />
          ) : (
            <Text style={styles.meta}>Reste au QG, à dispatcher ensuite.</Text>
          )}
          <Text style={styles.meta}>
            {groups[position]?.length ?? 0} ligne(s),{' '}
            {(groups[position] ?? []).reduce((sum, line) => sum + line.quantity, 0)} unité(s)
          </Text>
        </View>
      ))}

      {shipmentCount < maxShipments ? (
        <Button label="Ajouter un envoi" variant="outline" onPress={addShipment} />
      ) : null}

      <Field label="Quantités par envoi">
        {rows.map((row) => (
          <View key={row.reference} style={styles.card}>
            <Text style={styles.rowName} numberOfLines={2}>
              {row.name ?? row.reference}
            </Text>
            <Text style={styles.meta}>
              {row.reference} · quantité commandée : {row.quantity}
            </Text>
            {Array.from({ length: shipmentCount }, (_, position) => (
              <View key={position} style={styles.qtyRow}>
                <Text style={styles.qtyLabel}>{shipmentName(position)}</Text>
                <Stepper
                  value={quantities[row.reference]?.[position] ?? 0}
                  min={0}
                  max={row.quantity}
                  label={`${row.reference}, envoi ${position + 1}`}
                  onChange={(value) => changeQuantity(row.reference, position, value)}
                />
              </View>
            ))}
          </View>
        ))}
      </Field>
    </ActionSheet>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardActions: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  rowName: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  meta: { fontSize: fontSize.xs, color: t.textMuted },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  qtyLabel: { flex: 1, fontSize: fontSize.sm, color: t.text },
}));
