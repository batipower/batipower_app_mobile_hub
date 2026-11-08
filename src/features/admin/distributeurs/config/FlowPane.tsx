import { useState } from 'react';
import { Text, View } from 'react-native';

import { TextField } from '@/components/ui';
import { fontSize, makeStyles, spacing } from '@/theme';
import type {
  AdminWarehouseConfig,
  EbatDoneStatus,
  EbatShippingType,
  WarehouseFlowConfig,
} from '@/types/adminPartners';

import { Notice, SelectField } from '../../shared/components/FormParts';
import { ConfigActions } from './ConfigActions';
import { useSaveWarehouseConfig } from './useWarehouseConfig';

const SHIPPING_OPTIONS: { value: EbatShippingType; label: string }[] = [
  { value: 'L', label: 'Livraison' },
  { value: 'D', label: 'Drive' },
  { value: 'E', label: 'Enlèvement' },
];
const DONE_OPTIONS: { value: EbatDoneStatus; label: string }[] = [
  { value: 'shipped', label: 'Expédiée' },
  { value: 'picked-up', label: 'Retirée' },
];
const COMMENT_MAX = 500;

function flowError(flow: WarehouseFlowConfig): string | undefined {
  if (!flow.comment.includes('{reference}')) return 'Le commentaire doit contenir {reference}.';
  if (flow.comment.length > COMMENT_MAX) return `${COMMENT_MAX} caractères maximum.`;
  return undefined;
}

const same = (a: WarehouseFlowConfig, b: WarehouseFlowConfig) =>
  a.shippingType === b.shippingType && a.doneStatus === b.doneStatus && a.comment === b.comment;

/** Flux eBatPro d'un entrepôt : commandes classiques et commandes palette. */
export function FlowPane({
  distributorId,
  warehouseId,
  config,
}: {
  distributorId: string;
  warehouseId: string;
  config: AdminWarehouseConfig;
}) {
  const styles = useStyles();
  const [classic, setClassic] = useState(config.classic);
  const [pallet, setPallet] = useState(config.pallet);
  const { save, isSaving, confirmReset } = useSaveWarehouseConfig(distributorId, warehouseId);

  const dirty = !same(classic, config.classic) || !same(pallet, config.pallet);
  const classicError = flowError(classic);
  const palletError = flowError(pallet);
  const customized =
    !same(config.classic, config.defaults.classic) || !same(config.pallet, config.defaults.pallet);

  return (
    <View style={styles.pane}>
      <Notice>
        Définit comment les commandes de cet entrepôt sont passées sur eBatPro. Le commentaire doit contenir{' '}
        {config.commentPlaceholder || '{reference}'} (remplacé par la référence de la commande).
      </Notice>
      <FlowSection title="Commandes classiques" flow={classic} onChange={setClassic} error={classicError} />
      <FlowSection title="Commandes palette" flow={pallet} onChange={setPallet} error={palletError} />
      <ConfigActions
        dirty={dirty}
        valid={!classicError && !palletError}
        saving={isSaving}
        customized={customized}
        onSave={() => save({ classic, pallet })}
        onReset={() => confirmReset('Flux', { classic: null, pallet: null })}
      />
    </View>
  );
}

function FlowSection({
  title,
  flow,
  error,
  onChange,
}: {
  title: string;
  flow: WarehouseFlowConfig;
  error?: string;
  onChange: (flow: WarehouseFlowConfig) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <SelectField
        label="Type d'expédition"
        valueLabel={SHIPPING_OPTIONS.find((o) => o.value === flow.shippingType)?.label ?? ''}
        options={SHIPPING_OPTIONS}
        selected={[flow.shippingType]}
        searchable={false}
        onToggle={(v) => onChange({ ...flow, shippingType: v as EbatShippingType })}
      />
      <SelectField
        label="Statut qui termine la commande"
        valueLabel={DONE_OPTIONS.find((o) => o.value === flow.doneStatus)?.label ?? ''}
        options={DONE_OPTIONS}
        selected={[flow.doneStatus]}
        searchable={false}
        onToggle={(v) => onChange({ ...flow, doneStatus: v as EbatDoneStatus })}
      />
      <TextField
        label="Commentaire eBatPro"
        value={flow.comment}
        onChangeText={(comment) => onChange({ ...flow, comment })}
        multiline
        autoCapitalize="none"
        error={error}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  pane: { gap: spacing.xl },
  section: { gap: spacing.md },
  title: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
}));
