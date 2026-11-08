import { useState } from 'react';
import { View } from 'react-native';

import { TextField } from '@/components/ui';
import { spacing } from '@/theme';
import type { AdminWarehouseConfig } from '@/types/adminPartners';

import { Notice, SelectField, ToggleRow } from '../../shared/components/FormParts';
import { ConfigActions } from './ConfigActions';
import { useSaveWarehouseConfig } from './useWarehouseConfig';

function parseThreshold(raw: string): { value: number | null; error?: string } {
  if (raw.trim() === '') return { value: null };
  const n = Number(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return { value: null, error: 'Montant positif attendu.' };
  return { value: Math.round(n * 100) / 100 };
}

/** Flux palette : activation, entrepôt d'enlèvement et seuil de candidature. */
export function PalletPane({
  distributorId,
  warehouseId,
  config,
}: {
  distributorId: string;
  warehouseId: string;
  config: AdminWarehouseConfig;
}) {
  const current = config.palletFlow;
  const [enabled, setEnabled] = useState(current.enabled);
  const [pickupId, setPickupId] = useState(current.pickupWarehouseId ?? '');
  const [threshold, setThreshold] = useState(current.minTotalTTC === null ? '' : String(current.minTotalTTC).replace('.', ','));
  const { save, isSaving, confirmReset } = useSaveWarehouseConfig(distributorId, warehouseId);

  const parsed = parseThreshold(threshold);
  const options = config.pickupOptions.map((o) => ({ value: o.id, label: o.label, detail: o.distributorName }));
  const missingPickup = enabled && !pickupId;
  const dirty =
    enabled !== current.enabled ||
    pickupId !== (current.pickupWarehouseId ?? '') ||
    parsed.value !== current.minTotalTTC;
  const defaults = config.defaults.palletFlow;
  const customized =
    current.enabled !== defaults.enabled ||
    current.pickupWarehouseId !== defaults.pickupWarehouseId ||
    current.minTotalTTC !== defaults.minTotalTTC;

  return (
    <View style={{ gap: spacing.xl }}>
      <Notice>
        Une commande palette est enlevée dans un autre entrepôt que celui qui la prépare. Sans seuil, le seuil global de
        l’agent s’applique.
      </Notice>
      <ToggleRow label="Flux palette activé" value={enabled} onValueChange={setEnabled} />
      <SelectField
        label="Entrepôt d'enlèvement"
        required={enabled}
        valueLabel={options.find((o) => o.value === pickupId)?.label ?? ''}
        placeholder="Choisir un entrepôt"
        warning={missingPickup ? "Choisissez l'entrepôt d'enlèvement pour activer le flux." : null}
        options={options}
        selected={pickupId ? [pickupId] : []}
        noneLabel="Aucun"
        onToggle={setPickupId}
      />
      <TextField
        label="Seuil TTC de candidature (€)"
        value={threshold}
        onChangeText={setThreshold}
        keyboardType="decimal-pad"
        placeholder="Seuil global de l'agent"
        error={parsed.error}
      />
      <ConfigActions
        dirty={dirty}
        valid={!parsed.error && !missingPickup}
        saving={isSaving}
        customized={customized}
        onSave={() =>
          save({ palletFlow: { enabled, pickupWarehouseId: pickupId || null, minTotalTTC: parsed.value } })
        }
        onReset={() => confirmReset('Palette', { palletFlow: null })}
      />
    </View>
  );
}
