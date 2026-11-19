import { useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button, TextField } from '@/components/ui';
import { parseDecimal } from '@/features/products/websitePricing';
import { fontSize, makeStyles } from '@/theme';

import { DEFAULT_COMMISSION } from '../config';
import { useMarketplaceMutations } from '../hooks/useMarketplaceMutations';
import type { MarketplaceField } from '../navigation';
import { buildCommissionPayload } from '../payloads';
import {
  MarketplaceSheetData,
  useSheetParams,
  type SheetData,
} from './MarketplaceSheetData';

const TITLES: Record<MarketplaceField, string> = {
  objective: 'Objectif HT',
  commission: 'Commission',
  seller: 'Nom du vendeur',
};

function isField(value: string | undefined): value is MarketplaceField {
  return value === 'objective' || value === 'commission' || value === 'seller';
}

/**
 * Modification d'un champ d'une marketplace : objectif HT et commission (`PATCH
 * hub-app/products/:ref`, ManoMano par pays pour la commission) ou nom du vendeur BuyBox.
 */
export function FieldSheet() {
  const params = useSheetParams();
  const { field } = useLocalSearchParams<{ field?: string }>();
  if (!params || !isField(field)) return null;
  return (
    <MarketplaceSheetData title={TITLES[field]} params={params}>
      {(data) => <FieldForm data={data} field={field} />}
    </MarketplaceSheetData>
  );
}

function initialValue(data: SheetData, field: MarketplaceField): string {
  const { view } = data;
  const number = (value: number | null) => (value == null ? '' : String(value).replace('.', ','));
  if (field === 'objective') return number(view.targetPriceHT);
  if (field === 'commission') return number(view.commissionRate);
  return view.sellerName ?? '';
}

function FieldForm({ data, field }: { data: SheetData; field: MarketplaceField }) {
  const styles = useStyles();
  const { reference, config, pricing, view } = data;
  const { setSellerName, updateProduct } = useMarketplaceMutations(reference);
  const [text, setText] = useState(initialValue(data, field));
  const pending = setSellerName.isPending || updateProduct.isPending;
  const where = view.country === 'FR' ? config.label : `${config.label} ${view.country}`;

  const parsed = parseDecimal(text);
  // Objectif et commission : vide = retour à la valeur par défaut (`null`), sinon un nombre valide.
  const numberValid =
    text.trim() === '' || (parsed != null && parsed >= 0 && (field !== 'commission' || parsed < 100));
  const valid = field === 'seller' ? text.trim().length > 0 : numberValid;
  const unchanged = text.trim() === initialValue(data, field).trim();

  const submit = () => {
    if (!valid || unchanged || pending) return;
    const done = { onSuccess: () => router.back() };
    if (field === 'seller') {
      setSellerName.mutate({ marketplace: config.key, sellerName: text.trim() }, done);
      return;
    }
    const value = text.trim() === '' ? null : parsed;
    if (field === 'objective') {
      if (!config.targetField) return;
      updateProduct.mutate({ [config.targetField]: value }, done);
      return;
    }
    updateProduct.mutate(
      buildCommissionPayload(config.key, view.country, value, pricing.rentabilityRates.manoManoByCountry),
      done,
    );
  };

  const labels: Record<MarketplaceField, string> = {
    objective: 'Objectif (€ HT)',
    commission: 'Commission (%)',
    seller: 'Nom du vendeur',
  };

  return (
    <SheetScreen
      title={`${TITLES[field]} · ${where}`}
      closeLabel="Annuler"
      closeDisabled={pending}
      footer={
        <Button
          label="Enregistrer"
          loading={pending}
          disabled={!valid || unchanged}
          onPress={submit}
        />
      }
    >
      <Text style={styles.reference}>{reference}</Text>
      <TextField
        label={labels[field]}
        value={text}
        onChangeText={setText}
        keyboardType={field === 'seller' ? 'default' : 'decimal-pad'}
        autoCapitalize={field === 'seller' ? 'words' : 'none'}
        returnKeyType="done"
        autoFocus
        editable={!pending}
        error={
          valid
            ? undefined
            : field === 'seller'
              ? 'Saisissez le nom du vendeur.'
              : field === 'commission'
                ? 'Saisissez un taux entre 0 et 100.'
                : 'Saisissez un montant positif.'
        }
        onSubmitEditing={submit}
      />
      <Text style={styles.hint}>
        {field === 'commission'
          ? `Laissez vide pour revenir au taux par défaut de ${config.label} (${Math.round(DEFAULT_COMMISSION[config.key] * 100)} %).`
          : field === 'objective'
            ? "Prix de vente visé, hors taxes. Laissez vide pour retirer l'objectif."
            : 'Nom affiché pour le vendeur de la BuyBox.'}
      </Text>
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  reference: { fontSize: fontSize.sm, fontWeight: '700', color: t.textMuted },
  hint: { fontSize: fontSize.xs, lineHeight: 17, color: t.textSubtle },
}));
