import { useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Button, TextField } from '@/components/ui';
import { formatEuro } from '@/lib/format';
import { fontSize, makeStyles } from '@/theme';
import type { HubPricingRow, UpdateHubProductPayload } from '@/types/hubPricing';

import { SheetScreen } from '@/components/sheet/SheetScreen';
import { usePricingRow } from './hooks/usePricingRow';
import { useUpdatePricingRow } from './hooks/useUpdatePricingRow';
import type { PricingEditField } from './navigation';

type FieldMeta = {
  label: string;
  unit: string;
  hint: string;
  read: (row: HubPricingRow) => number | null;
  /** Valeur entière attendue (potentiel mensuel). */
  integer?: boolean;
};

const FIELDS: Record<PricingEditField, FieldMeta> = {
  fixPriceHT: {
    label: "Prix d'achat HT",
    unit: '€',
    hint: "Prix d'achat de référence utilisé pour toutes les marges.",
    read: (row) => row.fixPriceHT,
  },
  previSalesByMonth: {
    label: 'Potentiel mensuel',
    unit: 'pièces / mois',
    hint: 'Ventes mensuelles attendues, saisies à la main.',
    read: (row) => row.potential.previSalesByMonth,
    integer: true,
  },
  targetPriceAmazon: {
    label: 'Prix cible Amazon',
    unit: '€ TTC',
    hint: 'Prix visé sur la BuyBox Amazon.',
    read: (row) => row.marketplaces.amazon.targetPrice,
  },
  targetPriceManoMano: {
    label: 'Prix cible ManoMano',
    unit: '€ TTC',
    hint: 'Prix visé sur la BuyBox ManoMano.',
    read: (row) => row.marketplaces.manoMano.targetPrice,
  },
  targetPriceLeroyMerlin: {
    label: 'Prix cible Leroy Merlin',
    unit: '€ TTC',
    hint: 'Prix visé sur la BuyBox Leroy Merlin.',
    read: (row) => row.marketplaces.leroyMerlin.targetPrice,
  },
  targetPriceCastorama: {
    label: 'Prix cible Castorama',
    unit: '€ TTC',
    hint: 'Prix visé sur la BuyBox Castorama.',
    read: (row) => row.marketplaces.castorama.targetPrice,
  },
  targetPriceBricoman: {
    label: 'Prix cible Bricoman',
    unit: '€ TTC',
    hint: 'Prix visé sur la BuyBox Bricoman.',
    read: (row) => row.marketplaces.bricoman.targetPrice,
  },
};

export function isPricingEditField(value: string | undefined): value is PricingEditField {
  return !!value && value in FIELDS;
}

/** Analyse une saisie « 12,5 » ; `undefined` si invalide, `null` si vide (valeur effacée). */
function parseInput(text: string, integer: boolean): number | null | undefined {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return undefined;
  if (integer && !Number.isInteger(value)) return undefined;
  return value;
}

/** Édition d'une valeur numérique d'une ligne (prix d'achat, potentiel, prix cible). */
export function EditValueSheet() {
  const { reference, field } = useLocalSearchParams<{ reference: string; field: string }>();
  if (!reference || !isPricingEditField(field)) return null;
  return <EditValue reference={reference} field={field} />;
}

function EditValue({ reference, field }: { reference: string; field: PricingEditField }) {
  const styles = useStyles();
  const meta = FIELDS[field];
  const { row } = usePricingRow(reference);
  const update = useUpdatePricingRow();
  const current = row ? meta.read(row) : null;
  const [text, setText] = useState<string | null>(null);
  const value = text ?? (current != null ? String(current).replace('.', ',') : '');
  const parsed = parseInput(value, !!meta.integer);
  const invalid = parsed === undefined;
  const unchanged = parsed === current;

  const save = () => {
    if (invalid) return;
    const payload = { [field]: parsed } as UpdateHubProductPayload;
    update.mutate({ reference, payload }, { onSuccess: () => router.back() });
  };

  return (
    <SheetScreen
      title={meta.label}
      closeLabel="Annuler"
      footer={
        <Button
          label="Enregistrer"
          loading={update.isPending}
          disabled={invalid || unchanged || !row}
          onPress={save}
        />
      }
    >
      <Text style={styles.reference}>{reference}</Text>
      <TextField
        label={`${meta.label} (${meta.unit})`}
        value={value}
        onChangeText={setText}
        placeholder="Aucune valeur"
        keyboardType={meta.integer ? 'number-pad' : 'decimal-pad'}
        returnKeyType="done"
        autoFocus
        error={invalid ? 'Saisissez un nombre positif.' : undefined}
        onSubmitEditing={save}
      />
      <Text style={styles.hint}>{meta.hint}</Text>
      {current != null && !meta.integer ? (
        <Text style={styles.hint}>Valeur actuelle : {formatEuro(current)}</Text>
      ) : null}
      <Text style={styles.hint}>Laisser vide efface la valeur.</Text>
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  reference: { fontSize: fontSize.sm, fontWeight: '700', color: t.textMuted },
  hint: { fontSize: fontSize.xs, color: t.textSubtle },
}));
